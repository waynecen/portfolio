// Builds the site, serves the production build locally and screenshots it with a headless browser.
// Usage: node .claude/skills/snapshot/snapshot.mjs [outDir]
// Default outDir: snapshots/<short commit sha>. Exits non-zero if a shot fails or the page logs errors.

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { build, preview } from 'vite'

const sha = execSync('git rev-parse --short HEAD').toString().trim()
const dirty = execSync('git status --porcelain').toString().trim() !== ''
const out = resolve(process.argv[2] ?? `snapshots/${sha}${dirty ? '-dirty' : ''}`)
mkdirSync(out, { recursive: true })

const PORT = 4179
const URL = `http://localhost:${PORT}/`
// Edge ships with Windows; set SNAPSHOT_BROWSER=chrome to use Chrome instead.
const CHANNEL = process.env.SNAPSHOT_BROWSER ?? 'msedge'
// Software WebGL, so the 3D scene renders without a GPU.
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' })
const browser = await chromium.launch({ channel: CHANNEL, args: ARGS })
const errors = []
const shots = []
let failed = false

async function page(name, options, hour, season = 'summer') {
  const context = await browser.newContext(options)
  const p = await context.newPage()
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${name}: ${m.text()} ${m.location().url ?? ''}`)
  })
  // Pin the clock and the season, so shots compare between runs whatever the date.
  // Katsu stays put (?dog=stay), so it can't stand in the walk out of the room.
  await p.goto(hour === undefined ? URL : `${URL}?hour=${hour}&season=${season}&dog=stay`)
  return p
}

async function shot(p, name, clip) {
  const path = `${out}/${name}.png`
  await p.screenshot({ path, clip })
  shots.push(path)
}

// Hours to shoot the game at, one per time-of-day slot in src/game/sky.ts, then one in winter (season.ts).
const HOURS = [
  [10, 'morning'],
  [6, 'dawn'],
  [14, 'afternoon'],
  [18, 'evening'],
  [21, 'night'],
  [14, 'winter', 'winter'], // snowing (season.ts), shot at the hour it snows hardest
]

// In the game with the loader gone: `playing` comes at once, but `loading` stays until the models
// are in (up to MAX_WAIT in core/modelsIn.ts), and keys pressed under the loader are lost.
const startGame = (p) =>
  p.waitForFunction(() => document.body.classList.contains('playing') && !document.body.classList.contains('loading'), null, { timeout: 40000 })

async function hold(p, key, ms) {
  await p.keyboard.down(key)
  await p.waitForTimeout(ms)
  await p.keyboard.up(key)
}

try {
  // 1. The first view: with reduced motion the game doesn't start, so the plain page stays up.
  {
    const p = await page('page', { viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' })
    await p.waitForLoadState('networkidle')
    await shot(p, 'desktop-page')
    await p.context().close()
  }

  // 2. The game on desktop at each time of day (see src/game/sky.ts): the room you start in, then
  //    the island after walking out of the door. Mid-morning is the plain look, with no weather.
  for (const [hour, label, season] of HOURS) {
    const p = await page(`desktop ${label}`, { viewport: { width: 1280, height: 720 } }, hour, season)
    await startGame(p)
    await p.waitForTimeout(1500)
    if (label === 'morning' || label === 'night') await shot(p, `desktop-house-${label}`)
    // From the bed: down and right together into the front right corner (diagonally to the front
    // wall, then sliding along it), then down and left together, which slides back along the wall
    // into the doorway and out. The coat stand stands just left of the door, so it's reached from the
    // right. Every leg ends against a wall, so it needs no exact timing and a slow frame rate can't
    // miss the door; the first is long enough to reach the corner at the software renderer's few fps
    // (about 0.3 units/s in the room, with its point-light shadows), and extra time just presses into it.
    await p.keyboard.down('KeyD')
    await hold(p, 'KeyS', 32000)
    await p.keyboard.up('KeyD')
    await p.keyboard.down('KeyA')
    await p.keyboard.down('KeyS')
    try {
      await p.waitForSelector('body[data-scene="world"]', { timeout: 40000 }) // set by Game.tsx once outdoors; generous, since the software renderer runs at a few fps
      await p.keyboard.up('KeyA')
      await p.keyboard.up('KeyS')
      await p.waitForTimeout(2000) // past the fade back in, even when the first frames outdoors are slow
      await shot(p, `desktop-island-${label}`)
      // The player character close up on the doorstep (the camera keeps them mid-screen): the pill, or the 3D model.
      if (label === 'morning') await shot(p, 'desktop-character', { x: 490, y: 190, width: 300, height: 225 })
    } catch {
      console.error(`Could not walk out of the house (the room layout may have changed); skipped desktop-island-${label}.`)
      failed = true
    }
    await p.context().close()
  }

  // 3. The game on a phone.
  {
    const p = await page('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 10)
    await startGame(p)
    await p.waitForTimeout(1500)
    await shot(p, 'mobile-house')
    await p.context().close()
  }
} catch (e) {
  console.error(e)
  failed = true
} finally {
  await browser.close()
  await new Promise((done) => server.httpServer.close(done))
}

for (const s of shots) console.log(s)
if (errors.length) {
  console.error('Page errors:\n' + errors.join('\n'))
  failed = true
}
process.exit(failed ? 1 : 0)
