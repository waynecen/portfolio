import { create } from 'zustand'
import { clampSpot, inRoom, PIECE, pieceAt, place, tileAt, TILES, useRoom, whyNot, type PieceId, type Spot } from './room'
import { busy } from './core/interact'
import { blip, click, thud } from './core/sfx'
import { playerPos } from './core/state'
import { useGame } from './core/store'

// Edit mode, indoors: the player stands still and the furniture can be picked up and put down on
// the room's grid. With keys, a cursor moves a tile at a time and E picks up or puts down whatever
// is under it; with a mouse or finger, drag a piece. A piece is only put down where it fits
// (room.ts says why not); otherwise it stays in hand (keys) or goes back (drag).

export type Held = {
  id: PieceId
  /** Where it would go: its top-left tile. */
  at: Spot
  /** Where it was picked up from, to go back to. */
  from: Spot
  /** The tile of the piece that was grabbed, relative to its top-left, so a drag keeps hold of that tile. */
  grab: Spot
  /** Why it can't go at `at`, or null if it can. */
  problem: string | null
  /** Being dragged with a mouse or finger, rather than carried with the keys. */
  dragged: boolean
}

export const useEdit = create<{ cursor: Spot; held: Held | null }>(() => ({ cursor: { i: 0, j: 0 }, held: null }))

/** Starts or ends edit mode. Starting only works indoors with nothing else going on. */
export function toggleEdit() {
  if (useGame.getState().editing) return stopEdit()
  if (useGame.getState().scene !== 'house' || busy()) return
  const t = tileAt(playerPos.x, playerPos.z)
  useEdit.setState({ cursor: inRoom(t) ? t : { i: 0, j: 0 }, held: null })
  useGame.setState({ editing: true, focus: null })
  click()
}

export function stopEdit() {
  if (!useGame.getState().editing) return
  useEdit.setState({ held: null }) // anything in hand goes back where it was
  useGame.setState({ editing: false })
  click()
}

/** Picks up whatever is on tile `t` (to drag it, or carry it with the keys). Returns false if there's nothing there. */
export function pickUp(t: Spot, dragged = false): boolean {
  const p = pieceAt(t)
  if (!p) return false
  const from = useRoom.getState().spots[p.id]
  useEdit.setState({ cursor: t, held: { id: p.id, at: from, from, grab: { i: t.i - from.i, j: t.j - from.j }, problem: null, dragged } })
  click()
  return true
}

/** Moves the piece in hand so its grabbed tile is on `t` (kept inside the room). */
export function holdOver(t: Spot) {
  const h = useEdit.getState().held
  if (!h) return
  const p = PIECE[h.id]
  const at = clampSpot(p, { i: t.i - h.grab.i, j: t.j - h.grab.j })
  if (at.i === h.at.i && at.j === h.at.j) return
  useEdit.setState({
    cursor: { i: at.i + h.grab.i, j: at.j + h.grab.j },
    held: { ...h, at, problem: whyNot(p, at, playerPos) },
  })
}

/** Puts the piece in hand down where it is. Returns false (and keeps holding it) if it can't go there. */
export function putDown(): boolean {
  const h = useEdit.getState().held
  if (!h) return false
  const same = h.at.i === h.from.i && h.at.j === h.from.j
  if (!same && h.problem) {
    blip(0.6)
    return false
  }
  if (!same) place(h.id, h.at)
  useEdit.setState({ held: null })
  thud()
  return true
}

/** Drops the piece in hand back where it came from. */
export function putBack() {
  if (useEdit.getState().held) useEdit.setState({ held: null })
}

/** Moves the cursor (and anything in hand) by whole tiles. */
export function nudge(di: number, dj: number) {
  const { cursor, held } = useEdit.getState()
  const t = { i: cursor.i + di, j: cursor.j + dj }
  if (held) return holdOver(t)
  useEdit.setState({
    cursor: { i: Math.min(Math.max(t.i, TILES.i0), TILES.i1), j: Math.min(Math.max(t.j, TILES.j0), TILES.j1) },
  })
}

/** The use key in edit mode: pick up what's under the cursor, or put down what's in hand. */
export function use() {
  if (useEdit.getState().held) putDown()
  else if (!pickUp(useEdit.getState().cursor)) blip(0.6)
}

const MOVES: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
}

/** Handles a key press while editing. Returns true if it used the key. */
export function editKey(e: KeyboardEvent): boolean {
  const move = MOVES[e.code]
  if (move) {
    e.preventDefault()
    nudge(move[0], move[1])
    return true
  }
  switch (e.code) {
    case 'KeyE':
    case 'Enter':
    case 'Space':
      e.preventDefault() // Space would scroll the page
      if (!e.repeat) use()
      return true
    case 'Escape':
      if (e.repeat) return true
      if (useEdit.getState().held) putBack()
      else stopEdit()
      return true
    case 'KeyF':
      if (!e.repeat) stopEdit()
      return true
  }
  return false
}
