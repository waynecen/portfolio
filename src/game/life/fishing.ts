import { create } from 'zustand'
import { say, sayFirst } from '../core/interact'
import { keys, stick } from '../core/input'
import { click, landed, plop, reelClick, splash, whoosh } from '../core/sfx'
import { cameraZoom, playerFacing, playerPos } from '../core/state'
import { useGame } from '../core/store'
import { reducedMotion, useSettings } from '../core/settings'
import { readSaved, writeSaved } from '../core/persist'
import { hint } from '../core/keymap'

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
const ASSIST_BITE_TIME = 1.8 // with the fishing assist on (settings.ts)
const LAND_PAUSE = 0.35 // seconds between landing a fish and the words about it

// Reeling it in (ReelBar.tsx draws it): the fish tugs a needle along a bar, and holding left and
// right pushes back. Keep the needle in the green zone to fill the catch meter; outside it, the
// meter drains. Fill it to land the fish; let it drain, or let the needle hit an end, and it's gone.
// Needle units: -1 and 1 are the bar's ends.
const ZONE = 0.3 // half-width of the green zone
const ASSIST_ZONE = 0.45 // with the fishing assist on
const PUSH = 3.4 // how hard holding left or right pushes the needle (units/s²)
const PULL = [1.9, 4.2] // how hard the fish tugs: the weakest fish, and the strongest (units/s²)
const ASSIST_PULL = 0.7 // the fish's tug with the assist on, as a share
const TUG_EVERY = [0.25, 1.1] // seconds between the fish changing direction, at random between these
const EASE = [3, 10] // how sharply it turns to a new direction: lazily, or all at once (at random between these)
const LUNGE = [0.1, 0.3] // chance each turn is a lunge instead: the weakest fish, and the strongest
const LUNGE_PULL = 1.35 // a lunge tugs this many times harder
const LUNGE_TIME = [0.15, 0.3] // and lasts this long (s), before the next turn
const DAMP = 2.4 // how quickly the needle's swing dies away
const START = 0.25 // the catch meter's level on hooking
const FILL = [0.24, 0.11] // meter filled per second in the zone: the weakest fish, and the strongest
const DRAIN = 0.3 // meter drained per second outside it

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
  /** How hard it fights on the line, 0 (barely) to 1 (all it's got). */
  fight: number
}

/** Every fish, in the order the bag lists them. Placeholders: change names, words and odds freely. */
export const FISH: Fish[] = [
  { id: 'minnow', name: 'Silver minnow', description: 'Small, quick and everywhere. Hardly worth the bait.', color: '#c4ccd4', weight: 30, size: [5, 12], fight: 0 },
  { id: 'mackerel', name: 'Mackerel', description: 'Striped like the ripples it swims under.', color: '#5f8fa8', weight: 25, size: [20, 40], fight: 0.3 },
  { id: 'tang', name: 'Blue tang', description: 'Far brighter than anything this far north should be.', color: '#3f7fd9', weight: 18, size: [12, 25], fight: 0.35 },
  { id: 'puffer', name: 'Pufferfish', description: 'Puffed up in a huff the moment it left the water.', color: '#e0c25a', weight: 12, size: [10, 30], fight: 0.55 },
  { id: 'snapper', name: 'Red snapper', description: 'Put up a real fight. Your arms are still shaking.', color: '#d9624a', weight: 10, size: [30, 70], fight: 0.8 },
  { id: 'carp', name: 'Golden carp', description: 'They say it grants a wish. It didn’t say which.', color: '#f2b233', weight: 5, size: [40, 90], fight: 1 },
]
export type FishRecord = { count: number; best: number }
const SAVE_KEY = 'fish-v1'

function load(): Partial<Record<FishId, FishRecord>> {
  const saved: unknown = (readSaved(SAVE_KEY) ?? {})
  if (!saved || typeof saved !== 'object') return {}
  const out: Partial<Record<FishId, FishRecord>> = {}
  for (const f of FISH) {
    const r = (saved as Record<string, unknown>)[f.id] as FishRecord | undefined
    if (r && typeof r.count === 'number' && typeof r.best === 'number') out[f.id] = { count: r.count, best: r.best }
  }
  return out
}

/** idle: not fishing. cast: the float is flying out. wait: waiting for a bite. bite: hook it now! reel: bringing it in. */
export type Phase = 'idle' | 'cast' | 'wait' | 'bite' | 'reel'

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

/**
 * Per-frame state, outside React: seconds into the current phase and when the bite comes; and while
 * reeling, the fish on the line, the needle (-1..1) and its speed, the fish's tug, and the catch meter (0..1).
 */
export const line = { t: 0, biteAt: 0, fish: null as Fish | null, needle: 0, speed: 0, tug: 0, tugTo: 0, tugIn: 0, ease: 6, meter: 0, tick: 0 }

/** Half-width of the green zone right now (wider with the assist). */
export const reelZone = () => (useSettings.getState().fishAssist ? ASSIST_ZONE : ZONE)

const setPhase = (phase: Phase) => {
  line.t = 0
  useFishing.setState({ phase })
}

/** The barrel: takes a rod, or puts it back. */
export function toggleRod() {
  const { rod } = useFishing.getState()
  useFishing.setState({ rod: !rod })
  if (!rod)
    sayFirst(
      'rod',
      [
        'You take a fishing rod from the barrel.',
        `Look for ripples in the water off the end of the dock. ${hint('Right-click or press {bag}', 'Tap B')} to put the rod away.`,
      ],
      ['You take a fishing rod.'],
    )
}

/**
 * B (a tap of it on touch screens), or the Put away rod chip: puts the rod away (back in the barrel, so another can be taken), reeling in
 * first if the line is out. False if there's no rod in hand, so B opens the bag instead.
 */
export function putAwayRod(): boolean {
  const s = useGame.getState()
  if (!useFishing.getState().rod || s.dialogue || s.panel || s.editing || s.fading) return false
  stopFishing()
  click()
  useFishing.setState({ rod: false })
  return true
}

/** The ripple: casts the line there, if you have a rod. */
export function cast() {
  const s = useFishing.getState()
  if (!s.rod) {
    sayFirst(
      'ripple',
      ['Something is moving under the water.', 'You’ll need a rod. There’s a barrel of them at the foot of the dock.'],
      ['You’ll need a rod from the barrel.'],
    )
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
  } else if (phase === 'bite' && line.t >= (useSettings.getState().fishAssist ? ASSIST_BITE_TIME : BITE_TIME)) {
    setPhase('idle')
    say(['It got away…'])
  } else if (phase === 'reel') reeling(dt)
}

function reeling(dt: number) {
  const fish = line.fish!
  const assist = useSettings.getState().fishAssist
  // The fish picks a new direction and strength every so often and turns to it, sometimes lazily,
  // sometimes all at once; now and then it lunges instead, a short hard yank (more often the harder
  // it fights), so it can't be read from a rhythm.
  line.tugIn -= dt
  if (line.tugIn <= 0) {
    const strength = (PULL[0] + fish.fight * (PULL[1] - PULL[0])) * (assist ? ASSIST_PULL : 1)
    const between = (a: number[]) => a[0] + Math.random() * (a[1] - a[0])
    if (Math.random() < LUNGE[0] + fish.fight * (LUNGE[1] - LUNGE[0])) {
      line.tugTo = (Math.random() < 0.5 ? -1 : 1) * strength * LUNGE_PULL
      line.tugIn = between(LUNGE_TIME)
      line.ease = EASE[1]
    } else {
      line.tugTo = (Math.random() * 2 - 1) * strength
      line.tugIn = between(TUG_EVERY)
      line.ease = between(EASE)
    }
  }
  line.tug += (line.tugTo - line.tug) * (1 - Math.exp(-line.ease * dt))
  // The player pushes back with left and right (keys, arrows or the joystick).
  const push = Math.max(-1, Math.min(1, +keys.right - +keys.left + stick.x))
  line.speed = (line.speed + (line.tug + push * PUSH) * dt) * Math.exp(-DAMP * dt)
  line.needle += line.speed * dt
  if (Math.abs(line.needle) >= 1) {
    line.needle = Math.sign(line.needle)
    setPhase('idle')
    splash()
    say(['Snap! The line went too far and it got away.'])
    return
  }
  // In the zone the meter fills (slower for a strong fish), with a reel click now and then; outside it drains.
  if (Math.abs(line.needle) < reelZone()) {
    line.meter += (FILL[0] + fish.fight * (FILL[1] - FILL[0])) * dt
    line.tick -= dt
    if (line.tick <= 0) {
      line.tick = 0.14
      reelClick()
    }
  } else line.meter -= DRAIN * dt
  if (line.meter >= 1) {
    setPhase('idle')
    land(fish)
  } else if (line.meter <= 0) {
    setPhase('idle')
    say(['It slipped off the hook…'])
  }
}

/** F, Space or A (the interact keys) while fishing: hooks a biting fish (then it's reeled in with left and right), or reels in an empty line. False if not fishing. */
export function reel(): boolean {
  const { phase } = useFishing.getState()
  if (phase === 'idle') return false
  if (phase === 'reel') return true // already reeling: left and right do the work
  if (phase === 'bite') {
    line.fish = pick()
    line.needle = line.speed = line.tug = line.tugTo = line.tugIn = line.tick = 0
    line.meter = START
    click()
    setPhase('reel')
    return true
  }
  setPhase('idle')
  click()
  if (phase === 'wait') say(['You reel the line back in. Nothing on it.'])
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

function land(fish: Fish) {
  const size = Math.round(fish.size[0] + Math.random() ** 2 * (fish.size[1] - fish.size[0])) // big ones are rarer
  const { caught, spot } = useFishing.getState()
  const before = caught[fish.id]
  const next = { ...caught, [fish.id]: { count: (before?.count ?? 0) + 1, best: Math.max(before?.best ?? 0, size) } }
  // The ripple moves on to another spot.
  const move = 1 + Math.floor(Math.random() * (SPOTS.length - 1))
  useFishing.setState({ caught: next, spot: (spot + move) % SPOTS.length })
  writeSaved(SAVE_KEY, next)
  // Feedback, with rules for when it doesn't fire: the fanfare only for a new kind of fish (a
  // repeat gets a short blip), the zoom only for a new kind or a new biggest, and never with
  // reduced motion. The words wait a beat (LAND_PAUSE) so the moment lands before the box opens.
  const best = !!before && size > before.best
  landed(!before)
  if ((!before || best) && !reducedMotion()) cameraZoom.t = 0
  const lines = [`You caught a ${fish.name.toLowerCase()}! ${size} cm.`]
  if (!before) lines.push(`${fish.description} It’s in your bag.`)
  else if (best) lines.push('Your biggest one yet!')
  setTimeout(() => say(lines), LAND_PAUSE * 1000)
}

