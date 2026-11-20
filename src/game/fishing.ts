import { create } from 'zustand'
import { say } from './interact'
import { chime, click, plop, splash, whoosh } from './sfx'
import { playerFacing, playerPos } from './state'

// Fishing off the dock at the island's bottom-left corner (Dock.tsx draws it). Take a rod from the
// barrel at the foot of the dock, walk out and use the ripple in the water: the line goes out, and
// after a wait something bites. Press again while it's pulling the float under to land it. What you
// catch is kept in this browser and listed in the bag (InventoryPanel.tsx).

/** The dock: a walkway one tile and a bit wide, from the shore at ROOT out over the water to END. */
export const DOCK = { x: -9, half: 0.7, z0: 15.5, z1: 19.5 }
/** The land tile the dock leaves from. A road leads here (pois.ts). */
export const DOCK_ROOT = { x: -9, z: 15 }
/** The barrel of rods, on the grass beside the foot of the dock. */
export const BARREL_AT = { x: -8, z: 15.1 }

/** Where the ripple can be, in the water within a cast of the dock. It moves on after each catch. */
export const SPOTS = [
  { x: -9, z: 20.6 },
  { x: -10.55, z: 18.7 },
  { x: -7.45, z: 18.1 },
  { x: -10.5, z: 16.9 },
]

/** The water tiles the dock stands over, in its column: one per tile from the shore out to its end. */
export const DOCK_TILES = { i: DOCK.x, j0: Math.round(DOCK.z0 + 0.5), j1: Math.round(DOCK.z1 - 0.5) }

/**
 * True if water tile (i, j) shouldn't stop a player at x because they're stepping onto or along the
 * dock: the tiles under it and either side of it, while the player is in line with the deck. The
 * dock's own colliders (Dock.tsx) keep them on the planks instead.
 */
export function dockOpens(i: number, j: number, x: number): boolean {
  return j >= DOCK_TILES.j0 && j <= DOCK_TILES.j1 + 1 && Math.abs(i - DOCK.x) <= 1 && Math.abs(x - DOCK.x) < DOCK.half
}

/** True if (x, z) is on the deck: footsteps there sound of wood. */
export const onDock = (x: number, z: number) => Math.abs(x - DOCK.x) < DOCK.half && z > DOCK.z0 && z < DOCK.z1

export const CAST_TIME = 0.55 // seconds for the float to fly out
const WAIT = [2.5, 6] // seconds before a bite, at random between these
const BITE_TIME = 0.9 // seconds to react once it bites

export type FishId = 'minnow' | 'mackerel' | 'tang' | 'puffer' | 'snapper' | 'carp'

export type Fish = {
  id: FishId
  name: string
  description: string
  color: string
  /** How often it bites, relative to the others. */
  weight: number
  /** Length range in cm. */
  size: [number, number]
}

/** Every fish, in the order the bag lists them. Placeholders: change names, words and odds freely. */
export const FISH: Fish[] = [
  { id: 'minnow', name: 'Silver minnow', description: 'Small, quick and everywhere. Hardly worth the bait.', color: '#c4ccd4', weight: 30, size: [5, 12] },
  { id: 'mackerel', name: 'Mackerel', description: 'Striped like the ripples it swims under.', color: '#5f8fa8', weight: 25, size: [20, 40] },
  { id: 'tang', name: 'Blue tang', description: 'Far brighter than anything this far north should be.', color: '#3f7fd9', weight: 18, size: [12, 25] },
  { id: 'puffer', name: 'Pufferfish', description: 'Puffed up in a huff the moment it left the water.', color: '#e0c25a', weight: 12, size: [10, 30] },
  { id: 'snapper', name: 'Red snapper', description: 'Put up a real fight. Your arms are still shaking.', color: '#d9624a', weight: 10, size: [30, 70] },
  { id: 'carp', name: 'Golden carp', description: 'They say it grants a wish. It didn’t say which.', color: '#f2b233', weight: 5, size: [40, 90] },
]
export const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f])) as Record<FishId, Fish>

export type FishRecord = { count: number; best: number }
const SAVE_KEY = 'fish-v1'

function load(): Partial<Record<FishId, FishRecord>> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}')
    if (!saved || typeof saved !== 'object') return {}
    const out: Partial<Record<FishId, FishRecord>> = {}
    for (const f of FISH) {
      const r = (saved as Record<string, unknown>)[f.id] as FishRecord | undefined
      if (r && typeof r.count === 'number' && typeof r.best === 'number') out[f.id] = { count: r.count, best: r.best }
    }
    return out
  } catch {
    return {}
  }
}

/** idle: not fishing. cast: the float is flying out. wait: waiting for a bite. bite: pull now! */
export type Phase = 'idle' | 'cast' | 'wait' | 'bite'

type FishingState = {
  /** Holding a rod from the barrel. Not saved: it goes back in the barrel between visits. */
  rod: boolean
  phase: Phase
  /** Which of SPOTS the ripple is at. */
  spot: number
  /** Everything caught so far, by kind. */
  caught: Partial<Record<FishId, FishRecord>>
}

export const useFishing = create<FishingState>(() => ({ rod: false, phase: 'idle', spot: 0, caught: load() }))

/** Per-frame timing, outside React: seconds into the current phase, and when the bite comes. */
export const line = { t: 0, biteAt: 0 }

const setPhase = (phase: Phase) => {
  line.t = 0
  useFishing.setState({ phase })
}

/** The barrel: takes a rod, or puts it back. */
export function toggleRod() {
  const { rod } = useFishing.getState()
  useFishing.setState({ rod: !rod })
  if (!rod) say(['You take a fishing rod from the barrel.', 'Look for ripples in the water off the end of the dock.'])
}

/** The ripple: casts the line there, if you have a rod. */
export function cast() {
  const s = useFishing.getState()
  if (!s.rod) {
    say(['Something is moving under the water.', 'You’ll need a rod. There’s a barrel of them at the foot of the dock.'])
    return
  }
  const at = SPOTS[s.spot]
  playerFacing.heading = Math.atan2(at.x - playerPos.x, at.z - playerPos.z)
  playerFacing.snap = true
  line.biteAt = WAIT[0] + Math.random() * (WAIT[1] - WAIT[0])
  whoosh()
  setPhase('cast')
}

/** Advances the line by `dt` seconds; called every frame by <Fishing>. */
export function tick(dt: number) {
  const { phase } = useFishing.getState()
  if (phase === 'idle') return
  line.t += dt
  if (phase === 'cast' && line.t >= CAST_TIME) {
    plop()
    setPhase('wait')
  } else if (phase === 'wait' && line.t >= line.biteAt) {
    splash()
    setPhase('bite')
  } else if (phase === 'bite' && line.t >= BITE_TIME) {
    setPhase('idle')
    say(['It got away…'])
  }
}

/** E, Space or A while fishing: reels in, landing the fish if it's biting. False if not fishing. */
export function reel(): boolean {
  const { phase } = useFishing.getState()
  if (phase === 'idle') return false
  setPhase('idle')
  if (phase === 'bite') land()
  else {
    click()
    if (phase === 'wait') say(['You reel the line back in. Nothing on it.'])
  }
  return true
}

/** Esc: reels in quietly. */
export function stopFishing() {
  if (useFishing.getState().phase !== 'idle') setPhase('idle')
}

/** True while the line is out; the player stands still meanwhile. */
export const fishing = () => useFishing.getState().phase !== 'idle'

function pick(): Fish {
  let r = Math.random() * FISH.reduce((sum, f) => sum + f.weight, 0)
  for (const f of FISH) if ((r -= f.weight) < 0) return f
  return FISH[0]
}

function land() {
  const fish = pick()
  const size = Math.round(fish.size[0] + Math.random() ** 2 * (fish.size[1] - fish.size[0])) // big ones are rarer
  const { caught, spot } = useFishing.getState()
  const before = caught[fish.id]
  const next = { ...caught, [fish.id]: { count: (before?.count ?? 0) + 1, best: Math.max(before?.best ?? 0, size) } }
  // The ripple moves on to another spot.
  const move = 1 + Math.floor(Math.random() * (SPOTS.length - 1))
  useFishing.setState({ caught: next, spot: (spot + move) % SPOTS.length })
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next))
  } catch {
    // private mode or storage full: kept until the page closes
  }
  chime()
  const lines = [`You caught a ${fish.name.toLowerCase()}! ${size} cm.`]
  if (!before) lines.push(`${fish.description} It’s in your bag.`)
  else if (size > before.best) lines.push('Your biggest one yet!')
  say(lines)
}

