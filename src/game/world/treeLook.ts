import { Color } from 'three'
import { ISLET } from './land'
import { trees, type Tree } from './forest'
import { autumn, spring } from './season'
import type { Sway } from '../core/wind'

// What every tree shares, the placeholder cones (Trees.tsx) and the pine model (PineModel.tsx) alike:
// which trees are drawn, how they sway, and each one's colour this season.

// The islet's few trees, placed by hand (it lies past where trees scatter themselves). Kept out of
// `trees` so nothing that hides beside a tree (pearls.ts) goes looking out there.
const ISLET_TREES: Tree[] = [
  { x: ISLET.x - 3, z: ISLET.z - 1, scale: 1.1, turn: 0.4 },
  { x: ISLET.x + 3, z: ISLET.z, scale: 0.9, turn: 2.1 },
  { x: ISLET.x - 1, z: ISLET.z + 3, scale: 1.25, turn: 4 },
]
export const drawn = [...trees, ...ISLET_TREES]

// Every part of a tree shares one bend, so it sways together (core/wind.ts).
export const SWAY: Sway = { height: 1.65, amount: 0.07 }

export const GREEN = new Color('#3f7d4a')
const SPRING_GREEN = new Color('#4f9a55')
const BLOSSOM = [new Color('#f0a9c0'), new Color('#f6c6d4')]
const BLOSSOMING = 0.35 // share of trees in blossom in spring
const AUTUMN = ['#d9873a', '#c4632f', '#e3b04b', '#b5452f', '#8a9a3a'].map((c) => new Color(c))
/** Tree n's canopy colour this season, fixed per tree so it's the same on every visit. */
export function canopyColor(n: number): Color {
  const h = ((n * 2654435761) >>> 0) / 4294967296 // a fixed, spread-out number in [0, 1) per tree
  if (spring) return h < BLOSSOMING ? BLOSSOM[n % 2] : SPRING_GREEN
  if (autumn) return AUTUMN[Math.floor(h * AUTUMN.length)]
  return GREEN
}
