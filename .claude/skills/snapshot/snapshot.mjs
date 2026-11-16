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

async function page(name, options) {
  const context = await browser.newContext(options)
  const p = await context.newPage()
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  p.on('console', (m) => {
    const url = m.location().url ?? ''
    // The browser asks for /favicon.ico on its own; the site doesn't have one yet.
    if (m.type() === 'error' && !url.endsWith('/favicon.ico')) errors.push(`${name}: ${m.text()} ${url}`)
  })
  await p.goto(URL)
  return p
}

async function shot(p, name) {
  const path = `${out}/${name}.png`
  await p.screenshot({ path })
  shots.push(path)
}

const startGame = (p) => p.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 20000 })

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

  // 2. The game on desktop: the room you start in, then the island after walking out of the door.
  {
    const p = await page('desktop', { viewport: { width: 1280, height: 720 } })
    await startGame(p)
    await p.waitForTimeout(1500)
    await shot(p, 'desktop-house')
    // From the bed: right to the middle of the room, then down through the door.
    await hold(p, 'KeyD', 750)
    await hold(p, 'KeyS', 1800)
    try {
      await p.waitForSelector('.minimap', { timeout: 3000 }) // the minimap only shows outdoors
      await p.waitForTimeout(800)
      await shot(p, 'desktop-island')
    } catch {
      console.error('Could not walk out of the house (the room layout may have changed); skipped desktop-island.')
      failed = true
    }
    await p.context().close()
  }

  // 3. The game on a phone.
  {
    const p = await page('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
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
