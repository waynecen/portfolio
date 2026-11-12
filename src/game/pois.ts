import { tileAt, type Tile } from './grid'
import { projects, stationPos } from './projects'

// Points of interest: the single list that roads and the minimap are built from.
// Add a place here (and place its object at the same x/z) to give it a road and a map icon.

export type PoiKind = 'home' | 'project' | 'music'
export type Poi = { kind: PoiKind; x: number; z: number; label: string }

/** Spawn; every road starts from the plaza here. */
export const HUB = { x: 0, z: 0 }
/** To the right of spawn, just past the ring of project stations. Places sit on tile centres (whole numbers). */
export const RECORD_PLAYER = { x: 9, z: 0 }

export const pois: Poi[] = [
  { kind: 'home', ...HUB, label: 'Start' },
  ...stationPos.map((p, i) => ({ kind: 'project' as const, x: p.x, z: p.z, label: projects[i].title })),
  { kind: 'music', ...RECORD_PLAYER, label: 'Record player' },
]

/** Half-size of the square plaza at spawn, in tiles: 1 makes it 3×3. Every road starts from it. */
export const PLAZA = 1

const key = (t: Tile) => `${t.i},${t.j}`

// Tiles taken by places: roads route around them and stop on the tile next door.
const taken = new Set(pois.map((p) => key(tileAt(p.x, p.z))))

// Tiles from `from` to `to` (inclusive), walking along one axis and then the other: an L with a
// single 90° corner, or a straight line when they share a row or column.
function lPath(from: Tile, to: Tile, xFirst: boolean): Tile[] {
  const out: Tile[] = [{ ...from }]
  const t = { ...from }
  const walk = (axis: 'i' | 'j') => {
    while (t[axis] !== to[axis]) {
      t[axis] += Math.sign(to[axis] - t[axis])
      out.push({ ...t })
    }
  }
  walk(xFirst ? 'i' : 'j')
  walk(xFirst ? 'j' : 'i')
  return out
}

// A path is clear if nothing but its two ends sits on a place's tile.
const clear = (path: Tile[]) => path.every((t, n) => n === 0 || n === path.length - 1 || !taken.has(key(t)))

const hub = tileAt(HUB.x, HUB.z)

/**
 * Each road as tiles from the hub to the tile beside its place. It goes along the shorter axis
 * first, so it arrives along the longer one, facing the place. If that would cross another place's
 * tile, it takes the other L.
 */
export const roads: Tile[][] = pois
  .filter((p) => p.kind !== 'home')
  .map((p) => {
    const goal = tileAt(p.x, p.z)
    const xFirst = Math.abs(goal.i - hub.i) < Math.abs(goal.j - hub.j)
    let path = lPath(hub, goal, xFirst)
    if (!clear(path)) path = lPath(hub, goal, !xFirst)
    return path.slice(0, -1) // stop on the doorstep, not under the place itself
  })

/** Every plaza and road tile, once each: what Roads.tsx and the minimap draw. */
export const roadTiles: Tile[] = (() => {
  const seen = new Map<string, Tile>()
  for (let di = -PLAZA; di <= PLAZA; di++) {
    for (let dj = -PLAZA; dj <= PLAZA; dj++) {
      const t = { i: hub.i + di, j: hub.j + dj }
      seen.set(key(t), t)
    }
  }
  for (const road of roads) for (const t of road) seen.set(key(t), t)
  return [...seen.values()]
})()
