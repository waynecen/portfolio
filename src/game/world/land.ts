import { MeshLambertMaterial } from 'three'

// Where the land is: the island's circles, which tiles are land, and the water's level and colour.
// Island.tsx builds the ground from these (kept apart from it so the component file exports only
// components, which Vite's fast refresh needs).

/** Island size in tiles: every tile whose centre is closer than this to spawn is land. */
export const ISLAND_RADIUS = 18
/** The forest's land: every tile whose centre is closer than `r` to (x, z) is land too. */
export const FOREST = { x: -17, z: -15, r: 12 }
/**
 * A small islet out to sea, south of the dock, reached by rowing the boat there (Islet.tsx). It
 * lies past BOUND, so nothing that scatters itself over the island (trees, grass, pearls, daily
 * finds) lands on it by accident; what's on it is placed by hand.
 */
export const ISLET = { x: -10, z: 35, r: 4.5 }
/** The islet's east lobe, joined to it by a neck of land, where the mini golf green is (golf/). */
export const LINKS = { x: -2, z: 35, r: 5.5 }
/** The islet's circles of land: the islet itself and the links. */
export const ISLES = [ISLET, LINKS]
export const WATER_Y = -1.2 // water surface, well below the grass; the cliff fills the drop

/** Tile index bound: nothing past ±BOUND (on either axis) is land. */
export const BOUND = Math.ceil(Math.max(ISLAND_RADIUS, Math.abs(FOREST.x) + FOREST.r, Math.abs(FOREST.z) + FOREST.r))

const key = (i: number, j: number) => `${i},${j}`

const land = new Set<string>()
for (let i = -BOUND; i <= BOUND; i++)
  for (let j = -BOUND; j <= BOUND; j++)
    if (Math.hypot(i, j) < ISLAND_RADIUS || Math.hypot(i - FOREST.x, j - FOREST.z) < FOREST.r) land.add(key(i, j))
for (const c of ISLES)
  for (let i = Math.floor(c.x - c.r); i <= Math.ceil(c.x + c.r); i++)
    for (let j = Math.floor(c.z - c.r); j <= Math.ceil(c.z + c.r); j++) if (Math.hypot(i - c.x, j - c.z) < c.r) land.add(key(i, j))

/** True if tile (i, j) is land. */
export function isLand(i: number, j: number): boolean {
  return land.has(key(i, j))
}

/** True if tile (i, j) is land with at least `gap` tiles of land on every side (diagonals included). */
export function isInland(i: number, j: number, gap: number): boolean {
  for (let di = -gap; di <= gap; di++) for (let dj = -gap; dj <= gap; dj++) if (!isLand(i + di, j + dj)) return false
  return true
}

/** Water's colour for the time of day (Atmosphere.tsx tints it): the fountains use it, and the sea (Sea.tsx) shares its colour. */
export const waterMaterial = new MeshLambertMaterial({ color: '#5aa7c7' })
