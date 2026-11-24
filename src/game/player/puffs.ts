import { Color } from 'three'
import { secretOn } from '../secrets/secrets'
import { winter } from '../world/season'

// The pool of dust puffs Dust.tsx draws, and burst() for anything that throws some up. Kept apart
// from the component so it exports only components (Vite's fast refresh needs that).

export const COUNT = 32 // shared by the dust, confetti and bursts (cut grass, pots, slimes)
export const LIFE = 0.45 // seconds a puff lasts
export const SIZE = 0.09 // a puff's radius at its biggest

export const DUST = new Color(winter ? '#ffffff' : '#efe6d6')
export const CONFETTI = ['#e0566a', '#f2b233', '#5b9bd5', '#6cc27a', '#b07ad9'].map((c) => new Color(c))
export const colors: Color[] = Array.from({ length: COUNT }, () => DUST.clone())

// The pool, preallocated: position, velocity, age and size per puff. age >= LIFE means unused.
export const pos = new Float32Array(COUNT * 3)
export const vel = new Float32Array(COUNT * 3)
export const age = new Float32Array(COUNT).fill(LIFE)
export const size = new Float32Array(COUNT)
let next = 0

export function spawn(x: number, z: number, vx: number, vz: number, s: number, color?: Color) {
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
