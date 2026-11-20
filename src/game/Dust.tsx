import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { IcosahedronGeometry, MeshLambertMaterial, Object3D, type InstancedMesh } from 'three'
import { winter } from './season'
import { sky } from './sky'
import { playerPos, playerRoll, playerVel } from './state'
import { useGame } from './store'

// Little puffs of dust kicked up outdoors: a burst when a roll starts, and a trail while sprinting.
// One instanced mesh of low-poly balls from a fixed pool; each puff swells, drifts and shrinks to
// nothing, so no transparency is needed. Off in the rain (the ground is wet) and indoors;
// in winter they're puffs of snow, even while it snows.

const COUNT = 16
const LIFE = 0.45 // seconds a puff lasts
const SIZE = 0.09 // a puff's radius at its biggest
const BURST = 6 // puffs when a roll starts
const TRAIL = 0.12 // seconds between puffs while sprinting
const SPRINTING = 1.5 // speed (relative to walking) above which the trail starts
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const geometry = new IcosahedronGeometry(1, 0)
const material = new MeshLambertMaterial({ color: winter ? '#ffffff' : '#efe6d6', flatShading: true })

// The pool, preallocated: position, velocity, age and size per puff. age >= LIFE means unused.
const pos = new Float32Array(COUNT * 3)
const vel = new Float32Array(COUNT * 3)
const age = new Float32Array(COUNT).fill(LIFE)
const size = new Float32Array(COUNT)
let next = 0
const dummy = new Object3D()

function spawn(x: number, z: number, vx: number, vz: number, s: number) {
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
    for (let i = 0; i < COUNT; i++) m.setMatrixAt(i, dummy.matrix)
    m.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(delta, 0.1)
    const on = useGame.getState().scene === 'world' && (winter || sky.weather.rain < 0.5)

    // A roll just started: a ring of puffs at the feet, thrown out sideways and back.
    const rolling = playerRoll.p >= 0
    if (rolling && !s.rolling && on) {
      const n = reduced ? BURST / 2 : BURST
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5
        const out = 0.6 + Math.random() * 0.5
        spawn(playerPos.x, playerPos.z, Math.cos(a) * out - playerRoll.dirX * 0.8, Math.sin(a) * out - playerRoll.dirZ * 0.8, SIZE * (0.8 + Math.random() * 0.4))
      }
    }
    s.rolling = rolling

    // Sprinting: a puff behind the heels every TRAIL seconds.
    s.trail += dt
    if (on && !rolling && !reduced && playerVel.speed > SPRINTING && s.trail >= TRAIL) {
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
      changed = true
    }
    if (changed) m.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geometry, material, COUNT]} frustumCulled={false} />
}
