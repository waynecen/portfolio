import { tileAt, type Tile } from './grid'
import { DOCK_ROOT } from './fishing'
import { FOREST, isInland } from './Island'
import { HOUSE, NOTICE_AT, SHOP_AT } from './layout'
import { ABOUT_AT, CONTACT_AT } from './places'
import { projects, stationPos } from './projects'

// Points of interest: the single list that roads are built from.
// Add a place here (and place its object at the same x/z) to give it a road.

export type PoiKind = 'home' | 'project' | 'about' | 'contact' | 'dock' | 'forest' | 'notice' | 'shop'
export type Poi = { kind: PoiKind; x: number; z: number; label: string }

/** The house at the centre of the map, where the game starts. Places sit on tile centres (whole numbers). */
export const HUB = { x: 0, z: 0 }

export const pois: Poi[] = [
  { kind: 'home', ...HUB, label: 'Home' }, // signposts put this first (HOME below)
  { kind: 'about', ...ABOUT_AT, label: 'About' },
  { kind: 'contact', ...CONTACT_AT, label: 'Contact' },
  { kind: 'dock', ...DOCK_ROOT, label: 'Dock' },
  { kind: 'notice', ...NOTICE_AT, label: 'Notice board' },
  { kind: 'shop', ...SHOP_AT, label: 'Shop' },
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

// Signposts at the crossroads (Signposts.tsx): where roads meet or turn away from the house, a post
// saying which way to go for the nearest few places, by the shortest walk along the roads. The
// roads mostly branch off the loop round the house, so the far corners where they turn get one too.
const SIGNS = 5 // at most this many
const SIGN_APART = 6 // tiles between any two
const SIGN_HOME = 4 // crossroads at least this far from the house
const CORNER_HOME = 8 // and corners at least this far
const PER_WAY = 3 // places named for each direction, nearest first
const HOME = 'Home'

export type Way = 'n' | 'e' | 's' | 'w'
export type Signpost = { x: number; z: number; ways: { way: Way; places: string[] }[] }

const STEPS: [Way, number, number][] = [
  ['n', 0, -1],
  ['e', 1, 0],
  ['s', 0, 1],
  ['w', -1, 0],
]
const onRoad = new Set(roadTiles.map(key))
const onLoop = new Set(loop.map(key))
const placeTiles = new Set(pois.map((p) => key(tileAt(p.x, p.z))))

// Each place's doorstep: the last tile of its road (home's is the loop tile at the front door).
const doorsteps = pois.map((p, n) => {
  if (p.kind === 'home') return { label: p.label, tile: { i: 0, j: HOUSE.j1 + 1 } }
  const road = roads[pois.slice(0, n).filter((q) => q.kind !== 'home').length]
  return { label: p.label, tile: road[road.length - 1] ?? tileAt(p.x, p.z) }
})

// Road steps from `from` to every road tile, never through `not`.
function walk(from: Tile, not: Tile): Map<string, number> {
  const dist = new Map([[key(from), 0]])
  const queue = [from]
  for (let q = 0; q < queue.length; q++) {
    const t = queue[q]
    for (const [, di, dj] of STEPS) {
      const n = { i: t.i + di, j: t.j + dj }
      const k = key(n)
      if (!onRoad.has(k) || dist.has(k) || (n.i === not.i && n.j === not.j)) continue
      dist.set(k, dist.get(key(t))! + 1)
      queue.push(n)
    }
  }
  return dist
}

function signpostAt(at: Tile): Signpost | null {
  const ways: Signpost['ways'] = []
  const best = new Map<string, { way: Way; d: number }>()
  for (const [way, di, dj] of STEPS) {
    const n = { i: at.i + di, j: at.j + dj }
    if (!onRoad.has(key(n))) continue
    const dist = walk(n, at)
    for (const d of doorsteps) {
      const steps = dist.get(key(d.tile))
      if (steps === undefined || (d.tile.i === at.i && d.tile.j === at.j)) continue
      const b = best.get(d.label)
      if (!b || steps < b.d) best.set(d.label, { way, d: steps })
    }
  }
  for (const [way] of STEPS) {
    // Home first if it's this way, then the nearest.
    const places = doorsteps
      .filter((d) => best.get(d.label)?.way === way)
      .sort((a, b) => +(b.label === HOME) - +(a.label === HOME) || best.get(a.label)!.d - best.get(b.label)!.d)
      .slice(0, PER_WAY)
      .map((d) => d.label)
    if (places.length) ways.push({ way, places })
  }
  if (ways.length < 2) return null
  // The post stands on a corner of the crossroads, off the road: south-east if it's clear.
  for (const [di, dj] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const i = at.i + di
    const j = at.j + dj
    const k = key({ i, j })
    if (!onRoad.has(k) && !placeTiles.has(k) && !inHouse(i, j) && isInland(i, j, 1)) return { x: i, z: j, ways }
  }
  return null
}

/** The signposts, each beside a crossroads. */
export const signposts: Signpost[] = (() => {
  const out: Signpost[] = []
  const near = (t: Tile, d: number) => [...placeTiles].some((k) => {
    const [i, j] = k.split(',').map(Number)
    return Math.abs(i - t.i) <= d && Math.abs(j - t.j) <= d
  })
  const exits = (t: Tile) => STEPS.filter(([, di, dj]) => onRoad.has(key({ i: t.i + di, j: t.j + dj })))
  const crossings = roadTiles
    .filter((t) => !onLoop.has(key(t)) && exits(t).length >= 3 && Math.hypot(t.i, t.j) >= SIGN_HOME && !near(t, 1))
    .sort((a, b) => Math.hypot(a.i, a.j) - Math.hypot(b.i, b.j))
  // A corner: two ways out, at right angles.
  const corners = roadTiles
    .filter((t) => {
      const e = exits(t)
      return e.length === 2 && e[0][1] !== -e[1][1] && Math.hypot(t.i, t.j) >= CORNER_HOME && !near(t, 1)
    })
    .sort((a, b) => Math.hypot(a.i, a.j) - Math.hypot(b.i, b.j))
  for (const t of [...crossings, ...corners]) {
    if (out.length >= SIGNS) break
    if (out.some((s) => Math.hypot(s.x - t.i, s.z - t.j) < SIGN_APART)) continue
    const s = signpostAt(t)
    if (s) out.push(s)
  }
  return out
})()

const signTiles = new Set(signposts.map((s) => key({ i: s.x, j: s.z })))

/** True if tile (i, j) has something built on it: the house, or a signpost. Nothing else is placed there. */
export function built(i: number, j: number): boolean {
  return inHouse(i, j) || signTiles.has(key({ i, j }))
}
