import { create } from 'zustand'
import { INTERIOR, ROOM } from './world/layout'
import { PILL_RADIUS } from './player/PillCharacter'
import type { Spawn } from './core/scene'

// The furniture in the house, on the room's tile grid. Every piece covers a set block of tiles
// (its footprint: w across, d deep) and sits at a tile, so moving it in edit mode (edit.ts) is a
// matter of whole tiles. Positions are house-local tiles: tile (i, j) is centred on x = i, z = j.
// The layout is saved in the visitor's browser; a bad or missing save falls back to DEFAULT.

export type PieceId =
  | 'bed' | 'dresser' | 'table' | 'stool1' | 'stool2' | 'pot1' | 'pot2' | 'pot3' | 'chest' | 'rug' | 'recordPlayer'
  | 'lamp' | 'plant' | 'shelf'

export type Spot = { i: number; j: number }

export type Piece = {
  id: PieceId
  /** Shown while it's being moved: "Moving the bed". */
  name: string
  /** Footprint in tiles: across (x) and deep (z). */
  w: number
  d: number
  /** Lies on the floor (a rug): it can go under other furniture, and you can walk over it. */
  floor?: boolean
  /** Bought at the shop (shop.ts) for this many shells: only in the room once owned. */
  price?: number
}

export const PIECES: Piece[] = [
  { id: 'rug', name: 'the rug', w: 3, d: 2, floor: true },
  { id: 'bed', name: 'the bed', w: 1, d: 2 },
  { id: 'chest', name: 'the chest', w: 1, d: 1 },
  { id: 'dresser', name: 'the dresser', w: 3, d: 1 },
  { id: 'table', name: 'the table', w: 2, d: 1 },
  { id: 'stool1', name: 'a stool', w: 1, d: 1 },
  { id: 'stool2', name: 'a stool', w: 1, d: 1 },
  { id: 'pot1', name: 'a pot', w: 1, d: 1 },
  { id: 'pot2', name: 'a pot', w: 1, d: 1 },
  { id: 'pot3', name: 'a pot', w: 1, d: 1 },
  { id: 'recordPlayer', name: 'the record player', w: 1, d: 1 },
  { id: 'lamp', name: 'the paper lamp', w: 1, d: 1, price: 10 },
  { id: 'plant', name: 'the fern', w: 1, d: 1, price: 6 },
  { id: 'shelf', name: 'the bookshelf', w: 1, d: 1, price: 15 },
]
export const PIECE = Object.fromEntries(PIECES.map((p) => [p.id, p])) as Record<PieceId, Piece>

/** Where everything starts: each piece's top-left (lowest i and j) tile. */
const DEFAULT: Record<PieceId, Spot> = {
  rug: { i: -1, j: 1 },
  bed: { i: -4, j: -3 },
  chest: { i: -3, j: -3 },
  dresser: { i: -1, j: -3 },
  table: { i: 3, j: -3 },
  stool1: { i: 2, j: -3 },
  stool2: { i: 3, j: -2 },
  pot1: { i: -5, j: -1 },
  pot2: { i: -5, j: 0 },
  pot3: { i: -5, j: 1 },
  recordPlayer: { i: 5, j: -3 },
  // Where bought pieces go if there's room there (otherwise the nearest free tile: addPiece).
  lamp: { i: 5, j: 0 },
  plant: { i: -5, j: 2 },
  shelf: { i: -2, j: -3 },
}

// Pieces bought at the shop, kept in this browser. Only these (and everything that came with the
// room) are in it: placed() is the list every rule below works from.
const OWNED_KEY = 'decor-v1'
function loadOwned(): PieceId[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OWNED_KEY) ?? '[]')
    return Array.isArray(v) ? PIECES.filter((p) => p.price && v.includes(p.id)).map((p) => p.id) : []
  } catch {
    return []
  }
}
export const useOwned = create<{ owned: PieceId[] }>(() => ({ owned: loadOwned() }))
const computePlaced = () => PIECES.filter((p) => !p.price || useOwned.getState().owned.includes(p.id))
let placedNow = computePlaced()
useOwned.subscribe(() => (placedNow = computePlaced()))
/** The pieces in the room: everything that came with it, and anything bought. */
export const placed = () => placedNow

/** The room's tiles, inclusive: 11 across and 7 deep. */
export const TILES = { i0: -(ROOM.hx - 0.5), i1: ROOM.hx - 0.5, j0: -(ROOM.hz - 0.5), j1: ROOM.hz - 0.5 }
const COLS = TILES.i1 - TILES.i0 + 1
const ROWS = TILES.j1 - TILES.j0 + 1

/** The tile just inside the door. It and the one behind it stay clear so the way in is never blocked. */
const DOOR_TILE = { i: 0, j: TILES.j1 }
const DOORWAY: Spot[] = [DOOR_TILE, { i: 0, j: TILES.j1 - 1 }]

const SAVE_KEY = 'room-layout-v1'

/** A piece's centre in world units, when its top-left tile is `at`. */
export function centreOf(p: Piece, at: Spot) {
  return { x: INTERIOR.x + at.i + (p.w - 1) / 2, z: INTERIOR.z + at.j + (p.d - 1) / 2 }
}

/** The tile under a world position. */
export const tileAt = (x: number, z: number): Spot => ({ i: Math.round(x - INTERIOR.x), j: Math.round(z - INTERIOR.z) })

export const inRoom = (t: Spot) => t.i >= TILES.i0 && t.i <= TILES.i1 && t.j >= TILES.j0 && t.j <= TILES.j1

const covers = (p: Piece, at: Spot, i: number, j: number) => i >= at.i && i < at.i + p.w && j >= at.j && j < at.j + p.d

/** Moves `at` the least amount that keeps all of `p` inside the room. */
export function clampSpot(p: Piece, at: Spot): Spot {
  return {
    i: Math.min(Math.max(at.i, TILES.i0), TILES.i1 - p.w + 1),
    j: Math.min(Math.max(at.j, TILES.j0), TILES.j1 - p.d + 1),
  }
}

/** The piece on tile (i, j), if any; furniture before a rug under it. */
export function pieceAt(t: Spot, spots = useRoom.getState().spots): Piece | null {
  let under: Piece | null = null
  for (const p of placed()) {
    if (!covers(p, spots[p.id], t.i, t.j)) continue
    if (!p.floor) return p
    under = p
  }
  return under
}

// Which tiles furniture stands on (rugs don't count), with `moving` at `to` instead of where it is.
const blocked = new Uint8Array(COLS * ROWS)
function fillBlocked(spots: Record<PieceId, Spot>, moving?: Piece, to?: Spot) {
  blocked.fill(0)
  for (const p of placed()) {
    if (p.floor) continue
    const at = p === moving && to ? to : spots[p.id]
    for (let i = at.i; i < at.i + p.w; i++)
      for (let j = at.j; j < at.j + p.d; j++) blocked[(j - TILES.j0) * COLS + (i - TILES.i0)] = 1
  }
}

// Walks the free tiles out from the door. reached[k] is 1 for every tile you can walk to.
const reached = new Uint8Array(COLS * ROWS)
const queue = new Int16Array(COLS * ROWS)
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const
function floodFromDoor() {
  reached.fill(0)
  const start = (DOOR_TILE.j - TILES.j0) * COLS + (DOOR_TILE.i - TILES.i0)
  if (blocked[start]) return
  let head = 0
  let tail = 0
  queue[tail++] = start
  reached[start] = 1
  while (head < tail) {
    const k = queue[head++]
    const c = k % COLS
    const r = (k - c) / COLS
    for (const [dc, dr] of STEPS) {
      const nc = c + dc
      const nr = r + dr
      const n = nr * COLS + nc
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || blocked[n] || reached[n]) continue
      reached[n] = 1
      queue[tail++] = n
    }
  }
}

// The rules every layout keeps: inside the room, not on top of another piece (rugs only clash
// with rugs), and clear of the doorway.
function clash(p: Piece, at: Spot, spots: Record<PieceId, Spot>): string | null {
  if (at.i < TILES.i0 || at.j < TILES.j0 || at.i + p.w - 1 > TILES.i1 || at.j + p.d - 1 > TILES.j1) return 'It won’t fit there.'
  for (const o of placed()) {
    if (o === p || !!o.floor !== !!p.floor) continue
    const s = spots[o.id]
    if (at.i < s.i + o.w && s.i < at.i + p.w && at.j < s.j + o.d && s.j < at.j + p.d) return 'Something’s already there.'
  }
  if (!p.floor && DOORWAY.some((t) => covers(p, at, t.i, t.j))) return 'That would block the door.'
  return null
}

/** Why `p` can't go at `at` (with the player standing at world x, z), or null if it can. */
export function whyNot(p: Piece, at: Spot, player: { x: number; z: number }): string | null {
  const spots = useRoom.getState().spots
  const rule = clash(p, at, spots)
  if (rule || p.floor) return rule
  // The tiles the player's body touches.
  const px = player.x - INTERIOR.x
  const pz = player.z - INTERIOR.z
  for (let i = Math.round(px - PILL_RADIUS); i <= Math.round(px + PILL_RADIUS); i++)
    for (let j = Math.round(pz - PILL_RADIUS); j <= Math.round(pz + PILL_RADIUS); j++)
      if (covers(p, at, i, j)) return 'You’re standing there.'
  fillBlocked(spots, p, at)
  floodFromDoor()
  const t = tileAt(player.x, player.z)
  if (inRoom(t) && !reached[(t.j - TILES.j0) * COLS + (t.i - TILES.i0)]) return 'You’d be shut in.'
  return null
}

/** Puts `id` at `at` and saves the room. Check whyNot() first. */
export function place(id: PieceId, at: Spot) {
  useRoom.setState((s) => ({ spots: { ...s.spots, [id]: { i: at.i, j: at.j } } }))
  save()
}

/** Puts everything back where it started. */
export function resetRoom() {
  useRoom.setState({ spots: { ...DEFAULT } })
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // storage blocked: nothing was saved anyway
  }
}

/**
 * `at`, or the nearest tile to it you can walk to from the door if furniture now stands there
 * (where the game starts is beside the bed, wherever the bed has been moved since).
 */
export function clearSpawn(at: Spawn): Spawn {
  fillBlocked(useRoom.getState().spots)
  floodFromDoor()
  const t = tileAt(at.x, at.z)
  if (inRoom(t) && reached[(t.j - TILES.j0) * COLS + (t.i - TILES.i0)]) return at
  let best = DOOR_TILE
  let bestD = Infinity
  for (let k = 0; k < reached.length; k++) {
    if (!reached[k]) continue
    const i = (k % COLS) + TILES.i0
    const j = Math.floor(k / COLS) + TILES.j0
    const d = (i - t.i) ** 2 + (j - t.j) ** 2
    if (d < bestD) {
      bestD = d
      best = { i, j }
    }
  }
  return { x: INTERIOR.x + best.i, z: INTERIOR.z + best.j, heading: at.heading }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(useRoom.getState().spots))
  } catch {
    // storage blocked (private window): the layout lasts until the page closes
  }
}

// The saved layout, if it's whole and still makes sense (every piece in the room, nothing
// overlapping, the door clear); otherwise the default.
function load(): Record<PieceId, Spot> {
  let saved: unknown
  try {
    saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
  } catch {
    return { ...DEFAULT }
  }
  if (!saved || typeof saved !== 'object') return { ...DEFAULT }
  const spots = { ...DEFAULT }
  for (const p of PIECES) {
    const s = (saved as Record<string, unknown>)[p.id] as Spot | undefined
    if (!s || !Number.isInteger(s.i) || !Number.isInteger(s.j)) {
      if (p.price) continue // bought since the layout was saved: it keeps its default spot
      return { ...DEFAULT }
    }
    spots[p.id] = { i: s.i, j: s.j }
  }
  return placed().some((p) => clash(p, spots[p.id], spots)) ? { ...DEFAULT } : spots
}

if (import.meta.env.DEV) {
  for (const p of PIECES) {
    const problem = clash(p, DEFAULT[p.id], DEFAULT)
    if (problem) console.error(`room.ts: ${p.name} doesn't fit where DEFAULT puts it: ${problem}`)
  }
}

/** Where every piece is. Last in the file: loading the save uses the rules above. */
export const useRoom = create<{ spots: Record<PieceId, Spot> }>(() => ({ spots: load() }))

/**
 * A piece bought at the shop arrives in the room: at its default spot if that's free, otherwise
 * the nearest tile it fits. Returns false if there's nowhere at all (the room is full).
 */
export function addPiece(id: PieceId): boolean {
  const p = PIECE[id]
  const spots = { ...useRoom.getState().spots }
  useOwned.setState({ owned: [...useOwned.getState().owned.filter((x) => x !== id), id] })
  let at: Spot | null = clash(p, spots[id], spots) ? null : spots[id]
  let bestD = Infinity
  if (!at)
    for (let i = TILES.i0; i <= TILES.i1 - p.w + 1; i++)
      for (let j = TILES.j0; j <= TILES.j1 - p.d + 1; j++) {
        const d = (i - DEFAULT[id].i) ** 2 + (j - DEFAULT[id].j) ** 2
        if (d < bestD && !clash(p, { i, j }, spots)) {
          bestD = d
          at = { i, j }
        }
      }
  if (!at) {
    useOwned.setState({ owned: useOwned.getState().owned.filter((x) => x !== id) })
    return false
  }
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify(useOwned.getState().owned))
  } catch {
    // private mode or storage full: kept until the page closes
  }
  place(id, at)
  return true
}
