// The footprints left so far (Footprints.tsx draws them): a fixed pool, reused oldest first.
// Player.tsx calls addPrint at each step. Kept apart from the component so it exports only
// components (Vite's fast refresh needs that).

export const POOL = 48
export const LIFE = { road: 6, snow: 14 } // seconds a print lasts

export type PrintSurface = keyof typeof LIFE

type Print = { x: number; z: number; heading: number; surface: PrintSurface; side: number; born: number }
export const prints: Print[] = Array.from({ length: POOL }, () => ({ x: 0, z: 0, heading: 0, surface: 'road', side: 1, born: -1e9 }))
export const fresh: number[] = [] // prints left since the last frame, waiting for their matrix
let next = 0
let side = 1
/** The scene clock, kept by Footprints.tsx, so a print knows when it was left. */
export const printClock = { now: 0 }

/** Leaves a print at (x, z) for a step taken facing `heading`, alternating feet. */
export function addPrint(x: number, z: number, heading: number, surface: PrintSurface) {
  const p = prints[next]
  side = -side
  p.x = x
  p.z = z
  p.heading = heading
  p.surface = surface
  p.side = side
  p.born = printClock.now
  fresh.push(next)
  next = (next + 1) % POOL
}
