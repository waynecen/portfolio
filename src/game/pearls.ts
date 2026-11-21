import { create } from 'zustand'
import { tileAt } from './grid'
import { say, sayFirst } from './interact'
import { isInland } from './Island'
import { addTrack } from './music'
import { placeholderBonus } from './placeholderTracks'
import { built, pois, roadTiles } from './pois'
import { winter } from './season'
import { chime, landed } from './sfx'
import { PEARL_TRACK } from './tracks'
import { inForest, trees } from './Trees'

// Hidden pearls (HiddenPearls.tsx draws them): buried under a patch of disturbed earth, under a tuft of
// tall grass that has to be cut first (Grass.tsx), or tucked behind a tree, where the canopy hides
// them from the camera until the player walks round. Finding every one adds a record to the record
// player at home. Placed once from a fixed seed, so they're in the same spots on every visit; what's
// been found is kept in this browser.

/** How a pearl is hidden. In winter the grass is under snow, so a grass pearl is buried instead. */
export type Hide = 'dig' | 'grass' | 'tree' | 'open'
export type Pearl = { id: string; hide: Hide; x: number; z: number }

const SEED = 41 // change for different spots
const DIG = 3 // buried pearls
const GRASS = 3 // under tall grass
const AWAY = 6 // pearls keep at least this far from the house, and from each other

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Open meadow: off roads and places (and a tile round them), clear of trees and the house.
const key = (i: number, j: number) => `${i},${j}`
const closed = new Set<string>()
for (const t of roadTiles) closed.add(key(t.i, t.j))
for (const p of pois) {
  const t = tileAt(p.x, p.z)
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) closed.add(key(t.i + di, t.j + dj))
}
const paths = new Set(closed) // roads and places only
const treeTiles = new Set(trees.map((t) => key(Math.round(t.x), Math.round(t.z))))
for (const t of trees) {
  const i = Math.round(t.x)
  const j = Math.round(t.z)
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) closed.add(key(i + di, j + dj))
}
const open = (i: number, j: number) => !closed.has(key(i, j)) && !built(i, j)

function place(): Pearl[] {
  const random = rng(SEED)
  const out: Pearl[] = []
  const apart = (x: number, z: number) => Math.hypot(x, z) >= AWAY && out.every((p) => Math.hypot(p.x - x, p.z - z) >= AWAY)

  const meadow: { i: number; j: number }[] = []
  for (let i = -30; i <= 30; i++) for (let j = -30; j <= 30; j++) if (open(i, j) && isInland(i, j, 2)) meadow.push({ i, j })
  const take = (hide: Hide, n: number) => {
    for (let k = 0; k < n; k++)
      for (let tries = 0; tries < 400; tries++) {
        const t = meadow[Math.floor(random() * meadow.length)]
        if (!apart(t.i, t.j)) continue
        out.push({ id: `${hide}-${k}`, hide, x: t.i, z: t.j })
        break
      }
  }
  take('dig', DIG)
  take('grass', GRASS)

  // Behind a tree: the tile just north of it, which the camera (looking north) sees only through
  // the canopy. One in the forest, one on the main island.
  const behind = (forest: boolean) => {
    const list = trees.filter((t) => inForest(Math.round(t.x), Math.round(t.z)) === forest)
    for (let tries = 0; tries < 400; tries++) {
      const t = list[Math.floor(random() * list.length)]
      const i = Math.round(t.x)
      const j = Math.round(t.z) - 1
      if (isInland(i, j, 1) && !paths.has(key(i, j)) && !treeTiles.has(key(i, j)) && !built(i, j) && apart(i, j)) return { i, j }
    }
    return null
  }
  for (const [n, forest] of [true, false].entries()) {
    const t = behind(forest)
    if (t) out.push({ id: `tree-${n}`, hide: 'tree', x: t.i, z: t.j })
  }
  return out
}

/** Every pearl on the island. */
export const PEARLS: Pearl[] = place()

/** How `p` is hidden right now: grass pearls are buried while the grass is under snow. */
export const hiddenBy = (p: Pearl): Hide => (p.hide === 'grass' && winter ? 'dig' : p.hide)

const KEY = 'pearls-v1'
function load(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? PEARLS.filter((p) => v.includes(p.id)).map((p) => p.id) : []
  } catch {
    return []
  }
}

/** Pearls found (kept), and pearls whose grass has been cut this visit (shown on the ground). */
export const usePearls = create<{ found: string[]; revealed: string[] }>(() => ({ found: load(), revealed: [] }))

// The record found pearls unlock: a real file if tracks.ts gives one, else a generated loop.
const record = () => addTrack(PEARL_TRACK ?? placeholderBonus())
if (usePearls.getState().found.length === PEARLS.length) record()

/** The tuft over a grass pearl was cut: the pearl lies there to be picked up. */
export function revealPearl(id: string) {
  const s = usePearls.getState()
  if (!s.revealed.includes(id)) usePearls.setState({ revealed: [...s.revealed, id] })
}

/** Puts pearl `id` in the bag. The last one adds a record to the record player. */
export function findPearl(id: string) {
  const { found } = usePearls.getState()
  if (found.includes(id)) return
  const next = PEARLS.filter((p) => p.id === id || found.includes(p.id)).map((p) => p.id)
  usePearls.setState({ found: next })
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // private mode or storage full: kept until the page closes
  }
  const n = next.length
  if (n === PEARLS.length) {
    landed(true)
    record()
    say([
      `The last pearl! That’s all ${n}.`,
      'Holding them all together, you can almost hear a tune. There’s a new record by the record player at home.',
    ])
    return
  }
  chime()
  sayFirst(
    'pearl',
    [`A pearl! ${n} of ${PEARLS.length}.`, 'They’re hidden all over: buried, under tall grass, behind trees. Find every one and something nice happens.'],
    [`A pearl! ${n} of ${PEARLS.length}.`],
  )
}
