import { tileAt } from '../core/grid'
import { isInland, isLand } from './Island'
import { HOUSE } from './layout'
import { built, pois, roadTiles } from './pois'
import { trees } from './Trees'

// What stands on each tile, worked out once, for everything scattered over the island (grass,
// pickups, slimes, pearls, the daily finds) to ask whether a tile is free. Trees place themselves
// (Trees.tsx), so they keep their own clearings.

const key = (i: number, j: number) => `${i},${j}`
const roads = new Set(roadTiles.map((t) => key(t.i, t.j)))
const places = new Set(pois.map((p) => tileAt(p.x, p.z)).map((t) => key(t.i, t.j)))
const treeTiles = new Set(trees.map((t) => tileAt(t.x, t.z)).map((t) => key(t.i, t.j)))

const within = (set: Set<string>, i: number, j: number, ring: number, behind = ring) => {
  for (let di = -ring; di <= ring; di++) for (let dj = -behind; dj <= ring; dj++) if (set.has(key(i - di, j - dj))) return true
  return false
}

const onRoad = (i: number, j: number) => roads.has(key(i, j))

/** True if a road, or a place or a tile round it, is within `ring` tiles: what slimes keep away from. */
export function nearPath(i: number, j: number, ring: number) {
  for (let di = -ring; di <= ring; di++) for (let dj = -ring; dj <= ring; dj++) if (onRoad(i + di, j + dj) || within(places, i + di, j + dj, 1)) return true
  return false
}

type Margins = {
  /** Tiles kept clear round each place (a station, the sign, the shop…). Default 1; 0 is just the place's own tile. */
  place?: number
  /** Tiles kept clear round each tree. Default 0, the tree's own tile. */
  tree?: number
  /** How far behind (north of) a tree is kept clear, where its canopy would hide things from the camera. Default `tree`. */
  behind?: number
  /** Tiles kept clear round the house, beyond its own. Default 0. */
  house?: number
  /** How far in from the shore. Default 1; 0 is anywhere on land. */
  inland?: number
}

/** True if nothing stands on tile (i, j), nor within the given margins of it. */
export function clear(i: number, j: number, m: Margins = {}): boolean {
  const { place = 1, tree = 0, behind = tree, house = 0, inland = 1 } = m
  if (inland > 0 ? !isInland(i, j, inland) : !isLand(i, j)) return false
  if (onRoad(i, j) || built(i, j) || within(places, i, j, place) || within(treeTiles, i, j, tree, behind)) return false
  if (house > 0 && i >= HOUSE.i0 - house && i <= HOUSE.i1 + house && j >= HOUSE.j0 - house && j <= HOUSE.j1 + house) return false
  return true
}
