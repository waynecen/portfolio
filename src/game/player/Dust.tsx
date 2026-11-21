import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, IcosahedronGeometry, MeshLambertMaterial, Object3D, type InstancedMesh } from 'three'
import { secretOn } from '../secrets/secrets'
import { winter } from '../world/season'
import { sky } from '../world/sky'
import { playerPos, playerRoll, playerVel } from '../core/state'
import { useGame } from '../core/store'
import { reducedMotion } from '../core/settings'

// Little puffs of dust kicked up outdoors: a burst when a roll starts, and a trail while sprinting.
// One instanced mesh of low-poly balls from a fixed pool; each puff swells, drifts and shrinks to
// nothing, so no transparency is needed. Off in the rain (the ground is wet) and indoors;
// in winter they're puffs of snow, even while it snows.

const COUNT = 32 // shared by the dust, confetti and bursts (cut grass, pots, slimes)
const LIFE = 0.45 // seconds a puff lasts
const SIZE = 0.09 // a puff's radius at its biggest
const BURST = 6 // puffs when a roll starts
const TRAIL = 0.12 // seconds between puffs while sprinting
const SPRINTING = 1.5 // speed (relative to walking) above which the trail starts

const geometry = new IcosahedronGeometry(1, 0)
// White, so each puff's own colour shows: dust (or snow), or confetti with that secret on (secrets.ts).
const material = new MeshLambertMaterial({ color: '#ffffff', flatShading: true })
const DUST = new Color(winter ? '#ffffff' : '#efe6d6')
const CONFETTI = ['#e0566a', '#f2b233', '#5b9bd5', '#6cc27a', '#b07ad9'].map((c) => new Color(c))
const CONFETTI_STEP = 0.3 // with confetti on, walking at this speed (relative to walking) leaves a trail too
const colors: Color[] = Array.from({ length: COUNT }, () => DUST.clone())

// The pool, preallocated: position, velocity, age and size per puff. age >= LIFE means unused.
const pos = new Float32Array(COUNT * 3)
const vel = new Float32Array(COUNT * 3)
const age = new Float32Array(COUNT).fill(LIFE)
const size = new Float32Array(COUNT)
let next = 0
const dummy = new Object3D()

function spawn(x: number, z: number, vx: number, vz: number, s: number, color?: Color) {
  const i = next
  next = (next + 1) % COUNT
  pos[i * 3] = x
  pos[i * 3 + 1] = 0.08
  pos[i * 3 + 2] = z
  vel[i * 3] = vx
  vel[i * 3 + 1] = 0.4 + Math.random() * 0.3
  vel[i * 3 + 2] = vz
  age[i] = 0
  size[i] = s
  colors[i].copy(color ?? (secretOn('confetti') ? CONFETTI[Math.floor(Math.random() * CONFETTI.length)] : DUST))
}

/** A puff of `n` bits thrown out from (x, z) in `color`: cut grass, a broken pot, a popped slime. */
export function burst(x: number, z: number, n: number, color: Color) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.6
    const out = 0.8 + Math.random() * 0.8
    spawn(x, z, Math.cos(a) * out, Math.sin(a) * out, SIZE * (0.6 + Math.random() * 0.5), color)
  }
}

export function Dust() {
  const mesh = useRef<InstancedMesh>(null)
  const s = useRef({ rolling: false, trail: 0 }).current

  useEffect(() => {
    // Start with every instance hidden.
    const m = mesh.current
    if (!m) return
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (let i = 0; i < COUNT; i++) {
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, DUST) // makes the colour buffer now, so the shader doesn't change mid-game
    }
    m.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(delta, 0.1)
    const confetti = secretOn('confetti')
    // Dust only outdoors on dry ground; confetti anywhere.
    const on = confetti || (useGame.getState().scene === 'world' && (winter || sky.weather.rain < 0.5))

    // A roll just started: a ring of puffs at the feet, thrown out sideways and back.
    const rolling = playerRoll.p >= 0
    if (rolling && !s.rolling && on) {
      const n = reducedMotion() ? BURST / 2 : BURST
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5
        const out = 0.6 + Math.random() * 0.5
        spawn(playerPos.x, playerPos.z, Math.cos(a) * out - playerRoll.dirX * 0.8, Math.sin(a) * out - playerRoll.dirZ * 0.8, SIZE * (0.8 + Math.random() * 0.4))
      }
    }
    s.rolling = rolling

    // Sprinting: a puff behind the heels every TRAIL seconds.
    s.trail += dt
    if (on && !rolling && !reducedMotion() && playerVel.speed > (confetti ? CONFETTI_STEP : SPRINTING) && s.trail >= TRAIL) {
      s.trail = 0
      const len = Math.hypot(playerVel.x, playerVel.z) || 1
      const bx = -playerVel.x / len
      const bz = -playerVel.z / len
      spawn(playerPos.x + bx * 0.2, playerPos.z + bz * 0.2, bx * 0.4 + (Math.random() - 0.5) * 0.4, bz * 0.4 + (Math.random() - 0.5) * 0.4, SIZE * (0.6 + Math.random() * 0.3))
    }

    let changed = false
    for (let i = 0; i < COUNT; i++) {
      if (age[i] >= LIFE) continue
      age[i] += dt
      const t = Math.min(1, age[i] / LIFE)
      const drag = Math.exp(-4 * dt)
      vel[i * 3] *= drag
      vel[i * 3 + 1] *= drag
      vel[i * 3 + 2] *= drag
      pos[i * 3] += vel[i * 3] * dt
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt
      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
      dummy.scale.setScalar(t >= 1 ? 0 : size[i] * Math.sin(Math.PI * Math.sqrt(t))) // swells fast, shrinks slowly
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, colors[i])
      changed = true
    }
    if (changed) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  })

  return <instancedMesh ref={mesh} args={[geometry, material, COUNT]} frustumCulled={false} />
}
