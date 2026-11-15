import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { BoxGeometry, Color, Float32BufferAttribute, PlaneGeometry, type BufferGeometry, type MeshBasicMaterial } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TILE } from './grid'

// A blocky island centred on spawn, built from whole grid tiles: a grass plateau ringed by stone
// cliffs that drop into open water. The shoreline steps along tile edges, so every corner is 90°.
// The player walks right up to the cliff's rim and stops there (see Player.tsx).

/** Island size in tiles: every tile whose centre is closer than this to spawn is land. */
export const ISLAND_RADIUS = 18
const WATER_Y = -1.2 // water surface, well below the grass; the cliff fills the drop
const WATER_SIZE = 400 // wide enough that the camera never sees past it
const COURSES = 3 // rows of stone blocks in the cliff face, between the rim and the water
const UNDERWATER = 0.4 // the cliff carries on this far below the water so its foot never shows a gap
const RIM_TOP = 0.04 // the capstone rim stands this proud of the grass
const RIM_DEPTH = 0.16 // thickness of the rim, top to bottom
const RIM_IN = 0.14 // how far the rim reaches in over the grass
const RIM_OUT = 0.08 // how far the rim overhangs the cliff face
const FOAM = 0.4 // width of the surf border at the foot of the cliffs; under half a tile
const FOAM_PULSE = 1.2 // surf fades in and out at this rate (radians/s)

const STONE = ['#c9bfa9', '#bdb29b', '#d3cab6'].map((c) => new Color(c)) // cliff blocks pick one of these
const RIM = new Color('#e4ddca')

const N = Math.ceil(ISLAND_RADIUS) // tile index bound: nothing past ±N is land

const key = (i: number, j: number) => `${i},${j}`

const land = new Set<string>()
for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) if (Math.hypot(i, j) < ISLAND_RADIUS) land.add(key(i, j))

/** True if tile (i, j) is land. */
export function isLand(i: number, j: number): boolean {
  return land.has(key(i, j))
}

/** True if tile (i, j) is land with at least `gap` tiles of land on every side (diagonals included). */
export function isInland(i: number, j: number, gap: number): boolean {
  for (let di = -gap; di <= gap; di++) for (let dj = -gap; dj <= gap; dj++) if (!isLand(i + di, j + dj)) return false
  return true
}

// Flat square at height y covering [x0, x1] × [z0, z1].
const flat = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  new PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2)

// Paints every vertex of `g` one colour, so pieces of different shades merge into one mesh.
function tint(g: BufferGeometry, c: Color): BufferGeometry {
  const n = g.getAttribute('position').count
  const colors = new Float32Array(n * 3)
  for (let k = 0; k < n; k++) c.toArray(colors, k * 3)
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

// Fixed pseudo-random shade per block, so the cliff looks the same on every visit.
function shade(i: number, j: number, side: number, course: number): Color {
  const h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(side * 4 + course, 83492791)) >>> 0
  return STONE[h % STONE.length]
}

// Copy of `g` without an index buffer (disposing `g`), so planes and boxes merge with each other.
function unindexed(g: BufferGeometry): BufferGeometry {
  const out = g.toNonIndexed()
  g.dispose()
  return out
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  return merged
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
  const foamParts: BufferGeometry[] = []

  for (let i = -N - 1; i <= N + 1; i++)
    for (let j = -N - 1; j <= N + 1; j++) {
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
            stoneParts.push(tint(unindexed(face), shade(i, j, side, k)))
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
      } else {
        // Water tile: surf along each edge (and corner) that touches land. The tile is cut into a
        // 3×3 of border strips and corners so pieces never overlap and double up the opacity.
        const L = (di: number, dj: number) => isLand(i + di, j + dj)
        const spans = [
          [-h, -h + FOAM],
          [-h + FOAM, h - FOAM],
          [h - FOAM, h],
        ]
        for (let a = 0; a < 3; a++)
          for (let b = 0; b < 3; b++) {
            const di = a - 1
            const dj = b - 1
            if (di === 0 && dj === 0) continue
            // Edge strip: foam if the tile across that edge is land. Corner: if any of the three
            // tiles touching that corner is land.
            const foam = di === 0 || dj === 0 ? L(di, dj) : L(di, 0) || L(0, dj) || L(di, dj)
            if (foam)
              foamParts.push(flat(x + spans[a][0], x + spans[a][1], z + spans[b][0], z + spans[b][1], WATER_Y + 0.01))
          }
      }
    }

  return {
    grass: merge(grassParts),
    stone: merge(stoneParts),
    foam: merge(foamParts),
  }
}

const geometry = build()

export function Island() {
  const foam = useRef<MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (foam.current) foam.current.opacity = 0.45 + 0.2 * Math.sin(clock.elapsedTime * FOAM_PULSE)
  })

  return (
    <>
      {/* Grass: one square per land tile; its top is the floor at y = 0. */}
      <mesh geometry={geometry.grass}>
        <meshLambertMaterial color="#8cc084" />
      </mesh>
      {/* Cliffs and their capstone rim, every block in one mesh coloured per vertex. */}
      <mesh geometry={geometry.stone}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <mesh geometry={geometry.foam}>
        <meshBasicMaterial ref={foam} color="#ffffff" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={WATER_Y}>
        <planeGeometry args={[WATER_SIZE, WATER_SIZE]} />
        <meshLambertMaterial color="#5aa7c7" />
      </mesh>
    </>
  )
}
