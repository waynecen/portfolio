import { create } from 'zustand'
import { heal, hurting } from './health'
import { pickup } from './sfx'

// What cut grass, broken pots and popped slimes leave behind (Drops.tsx draws them): a shell (the
// island's currency, kept in this browser) or a heart. Walking over one picks it up. They wait a
// while, blink, and fade if left.

export type DropKind = 'shell' | 'heart'

const MAX = 16 // drops on the ground at once; the oldest goes if there's no room
export const DROP_LIFE = 20 // seconds a drop waits before it's gone (it blinks for the last few)
const GRAB = 0.55 // how close the player must come to pick one up

/** The pool, outside React: each slot's kind (null = empty), place and age. */
export const drops = Array.from({ length: MAX }, () => ({ kind: null as DropKind | null, x: 0, z: 0, age: 0 }))

/**
 * Leaves something behind at (x, z), maybe: `heart` and `shell` are the chances of each. A heart
 * only drops if the player is missing some; otherwise it's a shell instead.
 */
export function maybeDrop(x: number, z: number, heart: number, shell: number) {
  const r = Math.random()
  const kind: DropKind | null = r < heart ? (hurting() ? 'heart' : 'shell') : r < heart + shell ? 'shell' : null
  if (!kind) return
  let slot = drops.find((d) => !d.kind)
  if (!slot) slot = drops.reduce((a, b) => (b.age > a.age ? b : a)) // the oldest makes way
  slot.kind = kind
  slot.x = x + (Math.random() - 0.5) * 0.3
  slot.z = z + (Math.random() - 0.5) * 0.3
  slot.age = 0
}

/** Ages the drops and picks up any the player is standing on; called every frame by <Drops>. */
export function updateDrops(dt: number, px: number, pz: number) {
  for (let i = 0; i < drops.length; i++) {
    const d = drops[i]
    if (!d.kind) continue
    d.age += dt
    if (d.age > DROP_LIFE) {
      d.kind = null
      continue
    }
    if ((d.x - px) ** 2 + (d.z - pz) ** 2 < GRAB * GRAB && d.age > 0.25) {
      if (d.kind === 'heart') heal(2)
      else addShells(1)
      pickup()
      d.kind = null
    }
  }
}

const KEY = 'shells-v1'

function load(): number {
  try {
    const n = Number(localStorage.getItem(KEY) ?? 0)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

/** Shells in the visitor's pocket, kept in this browser. Spent at the shop, one day (ROADMAP C14). */
export const useShells = create<{ shells: number; at: number }>(() => ({ shells: load(), at: 0 }))

export function addShells(n: number) {
  const shells = useShells.getState().shells + n
  useShells.setState({ shells, at: Date.now() })
  try {
    localStorage.setItem(KEY, String(shells))
  } catch {
    // private mode or storage full: kept until the page closes
  }
}
