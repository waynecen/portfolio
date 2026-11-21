import { tileAt, type Tile } from './grid'
import { DOCK_ROOT } from './fishing'
import { FOREST } from './Island'
import { HOUSE, NOTICE_AT } from './layout'
import { ABOUT_AT, CONTACT_AT } from './places'
import { projects, stationPos } from './projects'

// Points of interest: the single list that roads are built from.
// Add a place here (and place its object at the same x/z) to give it a road.

export type PoiKind = 'home' | 'project' | 'about' | 'contact' | 'dock' | 'forest' | 'notice'
export type Poi = { kind: PoiKind; x: number; z: number; label: string }

/** The house at the centre of the map, where the game starts. Places sit on tile centres (whole numbers). */
export const HUB = { x: 0, z: 0 }

export const pois: Poi[] = [
  { kind: 'home', ...HUB, label: 'Home' },
  { kind: 'about', ...ABOUT_AT, label: 'About' },
  { kind: 'contact', ...CONTACT_AT, label: 'Contact' },
  { kind: 'dock', ...DOCK_ROOT, label: 'Dock' },
  { kind: 'notice', ...NOTICE_AT, label: 'Notice board' },
  { kind: 'forest', x: Math.round(FOREST.x), z: Math.round(FOREST.z), label: 'Forest clearing' },
  ...stationPos.map((p, i) => ({ kind: 'project' as const, x: p.x, z: p.z, label: projects[i].title })),
]

const key = (t: Tile) => `${t.i},${t.j}`

/** True if tile (i, j) is under the house. */
export function inHouse(i: number, j: number): boolean {
  return i >= HOUSE.i0 && i <= HOUSE.i1 && j >= HOUSE.j0 && j <= HOUSE.j1
}

// A path one tile wide all the way round the house; it passes the front door. Every road starts from it.
const loop: Tile[] = []
for (let i = HOUSE.i0 - 1; i <= HOUSE.i1 + 1; i++)
  for (let j = HOUSE.j0 - 1; j <= HOUSE.j1 + 1; j++) if (!inHouse(i, j)) loop.push({ i, j })

// Tiles roads must not cross: places, and the house.
const taken = new Set(pois.map((p) => key(tileAt(p.x, p.z))))
for (let i = HOUSE.i0; i <= HOUSE.i1; i++) for (let j = HOUSE.j0; j <= HOUSE.j1; j++) taken.add(key({ i, j }))

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

// A path is clear if nothing but its two ends sits on a place's tile or the house.
const clear = (path: Tile[]) => path.every((t, n) => n === 0 || n === path.length - 1 || !taken.has(key(t)))

// The loop tile closest to a place (fewest tiles to walk), where its road leaves the loop.
function nearestOnLoop(goal: Tile): Tile {
  let best = loop[0]
  let bestD = Infinity
  for (const t of loop) {
    const d = Math.abs(t.i - goal.i) + Math.abs(t.j - goal.j)
    if (d < bestD) {
      best = t
      bestD = d
    }
  }
  return best
}

/**
 * Each road as tiles from the loop round the house to the tile beside its place. It leaves the
 * loop at the tile nearest the place and goes along the shorter axis first, so it arrives along
 * the longer one, facing the place. If that would cross another place's tile, it takes the other L.
 */
export const roads: Tile[][] = pois
  .filter((p) => p.kind !== 'home')
  .map((p) => {
    const goal = tileAt(p.x, p.z)
    const start = nearestOnLoop(goal)
    const xFirst = Math.abs(goal.i - start.i) < Math.abs(goal.j - start.j)
    let path = lPath(start, goal, xFirst)
    if (!clear(path)) path = lPath(start, goal, !xFirst)
    return path.slice(0, -1) // stop on the doorstep, not under the place itself
  })

/** Every loop and road tile, once each: what Roads.tsx draws. */
export const roadTiles: Tile[] = (() => {
  const seen = new Map<string, Tile>()
  for (const t of loop) seen.set(key(t), t)
  for (const road of roads) for (const t of road) seen.set(key(t), t)
  return [...seen.values()]
})()
