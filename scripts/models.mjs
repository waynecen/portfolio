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
]

if (!existsSync(SRC)) {
  console.error(`No ${SRC}/ folder. Put raw .glb files there (it's gitignored).`)
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(SRC).filter((f) => f.endsWith('.glb'))
const cli = (args) => execFileSync('npx', ['gltf-transform', ...args], { stdio: 'inherit', shell: process.platform === 'win32' })
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

// Value of a channel at time t (linear or step; quaternions are blended then normalised).
function sample(times, values, size, t, step, quat) {
  const n = times.length
  let i = 0
  while (i < n - 1 && times[i + 1] <= t) i++
  const out = Array.from(values.slice(i * size, i * size + size))
  if (step || i >= n - 1 || t <= times[i]) return out
  const f = (t - times[i]) / (times[i + 1] - times[i])
  let dot = 0
  for (let k = 0; k < size; k++) dot += values[i * size + k] * values[(i + 1) * size + k]
  const sign = quat && dot < 0 ? -1 : 1 // take the short way round
  for (let k = 0; k < size; k++) out[k] += (sign * values[(i + 1) * size + k] - out[k]) * f
  if (quat) {
    const len = Math.hypot(...out) || 1
    for (let k = 0; k < size; k++) out[k] /= len
  }
  return out
}

const quatAngle = (v, a, b) => {
  const d = Math.abs(v[a] * v[b] + v[a + 1] * v[b + 1] + v[a + 2] * v[b + 2] + v[a + 3] * v[b + 3])
  return 2 * Math.acos(Math.min(1, d))
}

// Makes a clip loop seamlessly. Exporters often hand over a slice of motion whose last pose isn't its
// first, so every loop snaps (Tripo's run ended up to 83° off). If the seam is visible, this trims
// the clip to the stretch, at least MIN_LOOP of its length, whose end pose best matches its start;
// then it spreads what difference remains across the clip, so the last frame equals the first.
const SEAM = (5 * Math.PI) / 180 // a worst-bone mismatch above this is worth trimming for
const MIN_LOOP = 0.5
function makeLoop(anim) {
  const channels = anim.listChannels().filter((c) => c.getSampler().getInput().getCount() > 2)
  if (!channels.length) return
  // One timeline for every channel: the densest one's keys.
  const times = Array.from(channels.reduce((a, c) => (c.getSampler().getInput().getCount() > a.length ? c.getSampler().getInput().getArray() : a), []))
  const rots = []
  for (const c of anim.listChannels()) {
    const s = c.getSampler()
    const quat = c.getTargetPath() === 'rotation'
    const size = s.getOutput().getElementSize()
    const v = []
    for (const t of times) v.push(...sample(s.getInput().getArray(), s.getOutput().getArray(), size, t, s.getInterpolation() === 'STEP', quat))
    c.__v = v
    c.__size = size
    if (quat) rots.push(c)
  }
  const n = times.length
  const seam = (i, j) => rots.reduce((m, c) => Math.max(m, quatAngle(c.__v, 4 * i, 4 * j)), 0)
  let [a, b] = [0, n - 1]
  let best = seam(a, b)
  const before = best
  if (best > SEAM) {
    const minKeys = Math.ceil((n - 1) * MIN_LOOP)
    const cost = (i, j) => rots.reduce((s, c) => s + quatAngle(c.__v, 4 * i, 4 * j) ** 2, 0)
    let bestCost = Infinity
    for (let i = 0; i < n; i++)
      for (let j = i + minKeys; j < n; j++) {
        const c = cost(i, j) * (1 - 0.1 * ((j - i) / (n - 1))) // slightly prefer longer loops
        if (c < bestCost) [bestCost, a, b] = [c, i, j]
      }
    best = seam(a, b)
    if (best > before * 0.8) [a, b, best] = [0, n - 1, before] // trimming barely helps: keep it all
  }
  const t0 = times[a]
  const span = times[b] - t0
  const newTimes = new Float32Array(times.slice(a, b + 1).map((t) => t - t0))
  const input = anim.listSamplers()[0].getInput().clone().setArray(newTimes)
  for (const c of anim.listChannels()) {
    const size = c.__size
    const v = c.__v.slice(a * size, (b + 1) * size)
    const m = newTimes.length - 1
    const diff = []
    for (let k = 0; k < size; k++) diff.push(v[k] - v[m * size + k])
    if (c.getTargetPath() === 'rotation') {
      // q and -q are the same rotation: keep each key on the same side as the one before, so the
      // difference between the first and last keys is the real one.
      for (let i = 1; i <= m; i++) {
        let dot = 0
        for (let k = 0; k < 4; k++) dot += v[i * 4 + k] * v[(i - 1) * 4 + k]
        if (dot < 0) for (let k = 0; k < 4; k++) v[i * 4 + k] *= -1
      }
      for (let k = 0; k < 4; k++) diff[k] = v[k] - v[m * 4 + k]
    }
    for (let i = 0; i <= m; i++) {
      for (let k = 0; k < size; k++) v[i * size + k] += diff[k] * (i / m)
      if (c.getTargetPath() === 'rotation') {
        const len = Math.hypot(v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]) || 1
        for (let k = 0; k < 4; k++) v[i * 4 + k] /= len
      }
    }
    const s = c.getSampler()
    s.setInput(input)
    s.setInterpolation('LINEAR')
    s.setOutput(s.getOutput().clone().setArray(new Float32Array(v)))
    delete c.__v
    delete c.__size
  }
  const deg = (r) => ((r * 180) / Math.PI).toFixed(0)
  if (before > 1e-3)
    console.log(`  ${anim.getName()}: looped seamlessly (seam ${deg(before)}° → ${deg(best)}° before smoothing, ${span.toFixed(2)} s of ${(times[n - 1] - times[0]).toFixed(2)} s)`)
}

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
    makeLoop(anim) // after the root motion is gone, so the pace was measured over the whole clip
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
