import { create } from 'zustand'
import { say } from './interact'
import { CAVE, CAVE_PITCH, ROOM } from './layout'
import { chime, door, landed } from './sfx'
import { useGame } from './store'

// The cave behind the waterfall (CaveRooms.tsx draws it): a small dungeon of flip-screen rooms, the
// camera sliding from one to the next as the player walks through a doorway. Gentle by design: a
// block to push onto a plate gives a key, the key opens the door to a big slime, and past the big
// slime is a chest. Everything done in here is kept in this browser, and nothing in it blocks a project.

export type Door = 'open' | 'exit' | 'locked' | 'bars'
export type Room = { id: 'mouth' | 'blocks' | 'boss' | 'hoard'; i: number; j: number; doors: Partial<Record<'n' | 'e' | 's' | 'w', Door>> }

/** The rooms, by grid position (layout.ts: caveRoom). A wall with no door in this list is solid. */
export const ROOMS: Room[] = [
  { id: 'mouth', i: 0, j: 0, doors: { s: 'exit', n: 'locked', e: 'open' } },
  { id: 'blocks', i: 1, j: 0, doors: { w: 'open' } },
  { id: 'boss', i: 0, j: -1, doors: { s: 'bars', n: 'bars' } },
  { id: 'hoard', i: 0, j: -2, doors: { s: 'open' } },
]
export const ROOM_OF = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<Room['id'], Room>

/** The middle of room `r` in the world. */
export const centreOf = (r: Room) => ({ x: CAVE.x + r.i * CAVE_PITCH.x, z: CAVE.z + r.j * CAVE_PITCH.z })

/** The room at grid position (i, j), if there is one. */
export const roomAt = (i: number, j: number) => ROOMS.find((r) => r.i === i && r.j === j) ?? null

/** Tiles inside a room, room-local: i from -I to I, j from -J to J. */
export const I = ROOM.hx - 0.5
export const J = ROOM.hz - 0.5

// The push-block puzzle, room-local tiles in the blocks room: push the block onto the plate.
export const BLOCK_START = { i: -1, j: 0 }
export const PLATE = { i: 2, j: -2 }
export const PILLARS = [
  { i: 2, j: 0 },
  { i: -3, j: -2 },
  { i: 4, j: 1 },
]
/** Where the key's chest appears once the plate is pressed. */
export const KEY_CHEST = { i: 4, j: -2 }

type CaveState = {
  /** The block sits on the plate. */
  solved: boolean
  /** The small key: not found, in the bag, or used on the door. */
  key: 'none' | 'held' | 'used'
  /** The big slime has been popped. */
  beaten: boolean
  /** Its heart container has been picked up. */
  heart: boolean
  /** The chest in the last room has been opened. */
  oar: boolean
}

const KEY = 'cave-v1'
const FRESH: CaveState = { solved: false, key: 'none', beaten: false, heart: false, oar: false }
function load(): CaveState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<CaveState>
    return {
      solved: v.solved === true,
      key: v.key === 'held' || v.key === 'used' ? v.key : 'none',
      beaten: v.beaten === true,
      heart: v.heart === true,
      oar: v.oar === true,
    }
  } catch {
    return { ...FRESH }
  }
}

export const useCave = create<CaveState>(() => load())
function set(change: Partial<CaveState>) {
  useCave.setState(change)
  try {
    localStorage.setItem(KEY, JSON.stringify(useCave.getState()))
  } catch {
    // private mode or storage full: kept until the page closes
  }
}

/** One more heart for each heart container found. */
const HEARTS = 3
if (useCave.getState().heart) useGame.setState({ maxHearts: HEARTS + 1, health: (HEARTS + 1) * 2 })

/** The block came to rest on the plate. */
export function solve() {
  if (useCave.getState().solved) return
  set({ solved: true })
  chime()
  say(['Click! Somewhere in the room, something shifts.'])
}

/** Opens the key's chest. */
export function takeKey() {
  if (useCave.getState().key !== 'none') return
  set({ key: 'held' })
  landed(true)
  say(['You found a small key!', 'There was a locked door back in the first room.'])
}

/** Tries the locked door. */
export function tryDoor() {
  if (useCave.getState().key === 'held') {
    set({ key: 'used' })
    door()
    say(['The key turns with a heavy clunk, and the door swings open.'])
  } else say(['A heavy door with a keyhole. It won’t budge.', 'There might be a key somewhere in the cave.'])
}

/** The big slime popped. */
export function beat() {
  if (useCave.getState().beaten) return
  set({ beaten: true })
  landed(true)
  say(['The big slime bursts with a wet pop!', 'The bars slide back into the walls.'])
}

/** Picks up the heart container: one more heart, and every heart filled. */
export function takeHeart() {
  if (useCave.getState().heart) return
  set({ heart: true })
  useGame.setState({ maxHearts: HEARTS + 1, health: (HEARTS + 1) * 2 })
  landed(true)
  say(['A heart container! You have one more heart now.'])
}

/** Opens the chest in the last room. */
export function takeOar() {
  if (useCave.getState().oar) return
  set({ oar: true })
  landed(true)
  say(['You found an oar!', 'Somewhere on this island there must be a boat that’s missing one.'])
}
