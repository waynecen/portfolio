import { BoxGeometry, Color, MeshLambertMaterial, PlaneGeometry, type BufferGeometry } from 'three'
import { flat, merge, pick, tint, unindexed } from '../core/geometry'
import { TILE } from '../core/grid'
import { autumn, spring, winter } from './season'

// A blocky island centred on spawn, built from whole grid tiles: a grass plateau ringed by stone
// cliffs that drop into open water. It's two overlapping circles of land: the main island round the
// house, and a smaller one to the north-west (top left) that the forest grows on (Trees.tsx). The shoreline steps along tile edges, so every corner is 90°.
// The player walks right up to the cliff's rim and stops there (see Player.tsx).

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
const ISLES = [ISLET, LINKS]
export const WATER_Y = -1.2 // water surface, well below the grass; the cliff fills the drop
// The sea itself, its surf and its glints are in Sea.tsx.
const COURSES = 3 // rows of stone blocks in the cliff face, between the rim and the water
const UNDERWATER = 0.4 // the cliff carries on this far below the water so its foot never shows a gap
const RIM_TOP = 0.04 // the capstone rim stands this proud of the grass
const RIM_DEPTH = 0.16 // thickness of the rim, top to bottom
const RIM_IN = 0.14 // how far the rim reaches in over the grass
const RIM_OUT = 0.08 // how far the rim overhangs the cliff face

const STONE = ['#c9bfa9', '#bdb29b', '#d3cab6'].map((c) => new Color(c)) // cliff blocks pick one of these
const RIM = new Color('#e4ddca')
// Grass by the season (season.ts): fresh in spring, golden in autumn, under snow in winter.
const GROUND = winter ? '#eef3f8' : spring ? '#94cc86' : autumn ? '#a9b56c' : '#8cc084'

/** Tile index bound: nothing past ±BOUND (on either axis) is land. */
export const BOUND = Math.ceil(Math.max(ISLAND_RADIUS, Math.abs(FOREST.x) + FOREST.r, Math.abs(FOREST.z) + FOREST.r))
const N = BOUND

const key = (i: number, j: number) => `${i},${j}`

const land = new Set<string>()
for (let i = -N; i <= N; i++)
  for (let j = -N; j <= N; j++)
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

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

function build() {
  const h = TILE / 2
  const cliffBottom = WATER_Y - UNDERWATER
  const cliffTop = RIM_TOP - RIM_DEPTH
  const course = (cliffTop - cliffBottom) / COURSES
  const rimMid = RIM_TOP - RIM_DEPTH / 2
  const rimOffset = h + (RIM_OUT - RIM_IN) / 2 // rim centre's distance from the tile centre, across the edge

  const grassParts: BufferGeometry[] = []
  const stoneParts: BufferGeometry[] = []

  // The island's square, then the islet's (both its circles), the rows past the island's edge only so no tile is built twice.
  const tiles: [number, number][] = []
  for (let i = -N - 1; i <= N + 1; i++) for (let j = -N - 1; j <= N + 1; j++) tiles.push([i, j])
  const i0 = Math.min(...ISLES.map((c) => Math.floor(c.x - c.r))) - 1
  const i1 = Math.max(...ISLES.map((c) => Math.ceil(c.x + c.r))) + 1
  const j1 = Math.max(...ISLES.map((c) => Math.ceil(c.z + c.r))) + 1
  for (let i = i0; i <= i1; i++) for (let j = N + 2; j <= j1; j++) tiles.push([i, j])

  for (const [i, j] of tiles) {
    const x = i * TILE
    const z = j * TILE
    if (isLand(i, j)) {
      grassParts.push(flat(x - h, x + h, z - h, z + h, 0))
      DIRS.forEach(([di, dj], side) => {
        if (isLand(i + di, j + dj)) return
        // Cliff face down into the water on this side: a few courses of block-shaded stone.
        for (let k = 0; k < COURSES; k++) {
          const face = new PlaneGeometry(TILE, course)
          if (di !== 0) face.rotateY((di * Math.PI) / 2)
          else if (dj < 0) face.rotateY(Math.PI)
          face.translate(x + di * h, cliffBottom + course * (k + 0.5), z + dj * h)
          stoneParts.push(tint(unindexed(face), pick(STONE, i, j, side * 4 + k)))
        }
        // Capstone rim along the top. At an outside corner it runs on past the tile so the rims
        // of the two sides meet square; at an inside corner the neighbouring tile's rim covers it.
        const along = di !== 0 ? [0, 1] : [1, 0]
        const before = isLand(i - along[0], j - along[1]) ? 0 : RIM_OUT
        const after = isLand(i + along[0], j + along[1]) ? 0 : RIM_OUT
        const length = TILE + before + after
        const shift = (after - before) / 2
        const across = RIM_IN + RIM_OUT
        const rim =
          di !== 0
            ? new BoxGeometry(across, RIM_DEPTH, length).translate(x + di * rimOffset, rimMid, z + shift)
            : new BoxGeometry(length, RIM_DEPTH, across).translate(x + shift, rimMid, z + dj * rimOffset)
        stoneParts.push(tint(unindexed(rim), RIM))
      })
    }
  }

  return {
    grass: merge(grassParts),
    stone: merge(stoneParts),
  }
}

const geometry = build()

/** Water's colour for the time of day (Atmosphere.tsx tints it): the fountains use it, and the sea (Sea.tsx) shares its colour. */
export const waterMaterial = new MeshLambertMaterial({ color: '#5aa7c7' })

export function Island() {
  return (
    <>
      {/* Grass (or snow): one square per land tile; its top is the floor at y = 0. */}
      <mesh geometry={geometry.grass}>
        <meshLambertMaterial color={GROUND} />
      </mesh>
      {/* Cliffs and their capstone rim, every block in one mesh coloured per vertex. */}
      <mesh geometry={geometry.stone}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
    </>
  )
}
