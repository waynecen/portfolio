import { TILE, tileAt } from '../core/grid'
import { FOREST, ISLAND_RADIUS, isInland } from './land'
import { HOUSE, OUTCROP, SQUARE } from './layout'
import { pois, roadTiles } from './pois'

// Where the trees stand (Trees.tsx draws them): placed once at load from a fixed seed, so the layout
// is the same on every visit. Scattered over the main island, and packed close in the forest on the
// north-west land (FOREST in land.ts), round a clearing in its middle that a road leads to.

const SEED = 7 // change for a different layout
const MAX_TREES = 70 // on the main island; the forest has its own
const CLEARANCE = 1 // tiles kept free around every road tile, place and the house
const SHORE_GAP = 1 // tiles kept free between the trees and the beach
const MIN_SCALE = 0.8
const MAX_SCALE = 1.3
const FOREST_DENSITY = 0.85 // share of the forest's tree spots (every other tile, like a chessboard's dark squares) that get one
const FOREST_SCALE = [1, 1.5] // forest trees grow taller than the island's
const CLEARING = 3.5 // radius of the open clearing in the middle of the forest, in tiles

const key = (i: number, j: number) => `${i},${j}`

// Small seeded PRNG (mulberry32): returns floats in [0, 1).
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], random: () => number) {
  for (let k = list.length - 1; k > 0; k--) {
    const r = Math.floor(random() * (k + 1))
    ;[list[k], list[r]] = [list[r], list[k]]
  }
  return list
}

export type Tree = { x: number; z: number; scale: number; turn: number }

/** True if tile (i, j) is on the forest's land. */
export const inForest = (i: number, j: number) => Math.hypot(i - FOREST.x, j - FOREST.z) < FOREST.r

function place(): Tree[] {
  const random = rng(SEED)
  const trees: Tree[] = []

  // Tiles near roads and places stay clear so paths and doorsteps are never blocked.
  const blocked = new Set<string>()
  const keepClear = (i: number, j: number) => {
    for (let di = -CLEARANCE; di <= CLEARANCE; di++)
      for (let dj = -CLEARANCE; dj <= CLEARANCE; dj++) blocked.add(key(i + di, j + dj))
  }
  for (const t of roadTiles) keepClear(t.i, t.j)
  for (const p of pois) {
    const t = tileAt(p.x, p.z)
    keepClear(t.i, t.j)
  }
  for (let i = HOUSE.i0; i <= HOUSE.i1; i++) for (let j = HOUSE.j0; j <= HOUSE.j1; j++) keepClear(i, j)
  for (let i = OUTCROP.i0; i <= OUTCROP.i1; i++) for (let j = OUTCROP.j0; j <= OUTCROP.j1; j++) keepClear(i, j)
  for (let i = SQUARE.i0; i <= SQUARE.i1; i++) for (let j = SQUARE.j0; j <= SQUARE.j1; j++) keepClear(i, j)

  // The forest: trees on every other tile, like a chessboard's dark squares, with a few missing.
  // They're never side by side, only corner to corner, so there's always a way through on the
  // diagonals. Its trees keep the island's scattered ones a tile away.
  const near = new Set<string>()
  const fi = Math.round(FOREST.x)
  const fj = Math.round(FOREST.z)
  const fr = Math.ceil(FOREST.r)
  const forestTiles: { i: number; j: number }[] = []
  for (let i = fi - fr; i <= fi + fr; i++)
    for (let j = fj - fr; j <= fj + fr; j++)
      if ((i + j) % 2 === 0 && inForest(i, j) && isInland(i, j, SHORE_GAP) && Math.hypot(i - FOREST.x, j - FOREST.z) >= CLEARING)
        forestTiles.push({ i, j })
  const forestRandom = rng(SEED + 1)
  for (const { i, j } of shuffle(forestTiles, forestRandom)) {
    if (blocked.has(key(i, j)) || forestRandom() > FOREST_DENSITY) continue
    const scale = FOREST_SCALE[0] + forestRandom() * (FOREST_SCALE[1] - FOREST_SCALE[0])
    trees.push({ x: i * TILE, z: j * TILE, scale, turn: forestRandom() * Math.PI * 2 })
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) near.add(key(i + di, j + dj))
  }

  // The main island: every grass tile far enough from the shore and outside the forest, in a
  // seeded shuffled order. The shuffle ignores roads and places, so moving one only changes the
  // trees near it, not the whole forest.
  const n = Math.ceil(ISLAND_RADIUS)
  const candidates: { i: number; j: number }[] = []
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++) if (isInland(i, j, SHORE_GAP) && !inForest(i, j)) candidates.push({ i, j })
  shuffle(candidates, random)

  // Take tiles in that order, skipping any that touch a tree already placed (diagonals too),
  // so there's always a gap to walk between trees.
  let placed = 0
  for (const { i, j } of candidates) {
    if (placed >= MAX_TREES) break
    if (blocked.has(key(i, j)) || near.has(key(i, j))) continue
    trees.push({ x: i * TILE, z: j * TILE, scale: MIN_SCALE + random() * (MAX_SCALE - MIN_SCALE), turn: random() * Math.PI * 2 })
    placed++
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) blocked.add(key(i + di, j + dj))
  }
  return trees
}

export const trees = place()
