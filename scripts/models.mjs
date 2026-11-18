// Model pipeline: optimizes every raw .glb in models-src/ into public/models/, then reports what
// each one costs. Usage: npm run models [-- name.glb ...]  (no names = every file in models-src/)
// See docs/CHARACTER.md for where the raw files come from and the budget they should fit.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'

const SRC = 'models-src'
const OUT = 'public/models'
// Meshopt compresses geometry and animation and needs only a small decoder (no wasm transcoder).
// WebP keeps the download small; 1024 px is plenty for a character a few hundred pixels tall.
const FLAGS = ['--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024']

// Clips are renamed by the first keyword in their name, so the game's CLIPS (src/game/models.ts)
// can stay Idle / Walk / Run whatever the exporter called them (Tripo uses the motion's prompt).
const CLIP_NAMES = [
  [/idle/i, 'Idle'],
  [/walk/i, 'Walk'],
  [/run|sprint|jog/i, 'Run'],
  [/attack|slash|swing/i, 'Attack'],
  [/roll|dodge/i, 'Roll'],
]

if (!existsSync(SRC)) {
  console.error(`No ${SRC}/ folder. Put raw .glb files there (it's gitignored).`)
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(SRC).filter((f) => f.endsWith('.glb'))
const cli = (args) => execFileSync('npx', ['gltf-transform', ...args], { stdio: 'inherit', shell: process.platform === 'win32' })
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

// Renames the clips, and makes them play in place: the game moves the player itself, so any
// forward travel baked into the root bone (root motion) would slide the model ahead of the player
// and snap it back every loop. The drift across the clip is removed; the bounce within it stays.
// The travel it had is kept as the clip's pace, in body heights per second (extras.travel), so the
// game can play the clip at the speed where the feet keep up with the ground.
async function prepare(input, output) {
  const doc = await io.read(input)
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
  const { min, max } = getBounds(scene)
  const height = max[1] - min[1] || 1
  for (const anim of doc.getRoot().listAnimations()) {
    const old = anim.getName()
    const match = CLIP_NAMES.find(([re]) => re.test(old))
    if (match) anim.setName(match[1])
    for (const channel of anim.listChannels()) {
      if (channel.getTargetPath() !== 'translation' || !/hips|root|pelvis/i.test(channel.getTargetNode()?.getName() ?? '')) continue
      const sampler = channel.getSampler()
      const times = sampler.getInput().getArray()
      const out = sampler.getOutput()
      const v = out.getArray().slice()
      const n = times.length
      if (n < 2) continue
      const span = times[n - 1] - times[0]
      const dx = v[3 * n - 3] - v[0]
      const dz = v[3 * n - 1] - v[2]
      if (Math.hypot(dx, dz) < 1e-3) continue
      // The bone's translation is in its parent's space, which may be scaled (e.g. an armature at 0.01).
      const m = channel.getTargetNode().getParentNode()?.getWorldMatrix()
      const parentScale = m ? Math.hypot(m[0], m[1], m[2]) : 1
      const travel = (Math.hypot(dx, dz) * parentScale) / height / span
      anim.setExtras({ ...anim.getExtras(), travel })
      for (let i = 0; i < n; i++) {
        const f = (times[i] - times[0]) / span
        v[3 * i] -= dx * f
        v[3 * i + 2] -= dz * f
      }
      out.setArray(v)
      console.log(`  ${anim.getName()}: removed root motion (pace ${travel.toFixed(2)} body heights/s)`)
    }
    if (old !== anim.getName()) console.log(`  clip "${old}" → ${anim.getName()}`)
  }
  await io.write(output, doc)
}

const tmp = mkdtempSync(join(tmpdir(), 'models-'))
try {
  for (const name of names) {
    const input = join(SRC, name)
    const output = join(OUT, name)
    const prepared = join(tmp, name)
    console.log(`\n▸ ${input} → ${output}`)
    await prepare(input, prepared)
    cli(['optimize', prepared, output, ...FLAGS])
    const kb = (f) => (statSync(f).size / 1024).toFixed(0)
    console.log(`  ${kb(input)} KB → ${kb(output)} KB`)
    cli(['inspect', output])
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
