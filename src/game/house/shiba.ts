import { firstTime } from '../core/log'
import { say } from '../core/interact'
import { woof } from '../core/sfx'
import { playerPos } from '../core/state'
import { PILL_RADIUS } from '../player/PillCharacter'
import { INTERIOR } from '../world/layout'
import { tileAt, walkableTiles, type Spot } from './room'

// Katsu, the house shiba (Dog.tsx draws it): wanders the room from one free tile to another, trots
// out of the way if the player bumps into it, and can be petted: it sits, wags like mad, gives a
// little woof and hearts float up. Its state lives here, outside React, moved on once a frame.

export const WALK = 0.9 // its pace, units/s
export const TROT = 1.8 // getting out of the player's way
const PAUSE = [1.5, 5] // seconds it stands between wanders
const WANDER = 8 // it wanders to free tiles within this many tiles (4-way steps)
const ROAM = 3 // and goes at least this far when it can, so it crosses the room rather than pottering
export const RADIUS = 0.22 // its collider
export const RANGE = 1.1 // how close the player must be to pet it
export const SIT = 2.6 // seconds it sits after a pet
const TOUCH = 0.05 // beyond the two bodies' radii, counts as bumping into it
const START: Spot = { i: -2, j: 0 } // where it starts, house-local; moved to the nearest free tile if furniture is there
// ?dog=stay keeps it on its START tile (it can still be petted): the snapshot skill walks out of the
// room past where it might wander.
const STAY = new URLSearchParams(location.search).get('dog') === 'stay'

const centre = (t: Spot) => ({ x: INTERIOR.x + t.i, z: INTERIOR.z + t.j })

export const dog = {
  x: centre(START).x,
  z: centre(START).z,
  heading: 0,
  path: [] as Spot[],
  step: 0,
  speed: WALK,
  wait: 1,
  sit: 0, // seconds left sitting after a pet
  moving: false,
  hearts: -1, // seconds since the last pet's hearts appeared (-1: none showing)
}

const key = (t: Spot) => `${t.i},${t.j}`

// The shortest walk over free tiles (4-way), from `from` to `to`; empty if there's none.
function route(from: Spot, to: Spot, free: Set<string>): Spot[] {
  const back = new Map<string, Spot | null>([[key(from), null]])
  const queue = [from]
  while (queue.length) {
    const t = queue.shift()!
    if (t.i === to.i && t.j === to.j) {
      const path: Spot[] = []
      for (let s: Spot | null = t; s; s = back.get(key(s)) ?? null) path.unshift(s)
      return path.slice(1)
    }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { i: t.i + di, j: t.j + dj }
      if (!free.has(key(n)) || back.has(key(n))) continue
      back.set(key(n), t)
      queue.push(n)
    }
  }
  return []
}

/** Sets off for a free tile: anywhere near (`away` false), or as far from the player as it can get nearby. */
function setOff(away: boolean) {
  const tiles = walkableTiles()
  const free = new Set(tiles.map(key))
  const here = tileAt(dog.x, dog.z)
  const player = tileAt(playerPos.x, playerPos.z)
  // Only furniture moves it off its own tile (the player standing on it too just sends it walking).
  if (!free.has(key(here))) {
    // Furniture's been put where it stands (edit mode): hop to the nearest free tile.
    let best: Spot | null = null
    let bestD = Infinity
    for (const t of free.size ? tiles : []) {
      const d = (t.i - here.i) ** 2 + (t.j - here.j) ** 2
      if (free.has(key(t)) && d < bestD) {
        bestD = d
        best = t
      }
    }
    if (best) {
      dog.x = centre(best).x
      dog.z = centre(best).z
    }
    dog.path = []
    return
  }
  free.delete(key(player))
  free.add(key(here)) // still its own to walk off, if the player's on it too
  const near = tiles.filter((t) => free.has(key(t)) && Math.abs(t.i - here.i) + Math.abs(t.j - here.j) <= (away ? 3 : WANDER) && (t.i !== here.i || t.j !== here.j))
  if (!near.length) return
  const far = near.filter((t) => Math.abs(t.i - here.i) + Math.abs(t.j - here.j) >= ROAM)
  const pool = !away && far.length ? far : near
  let to = pool[Math.floor(Math.random() * pool.length)]
  if (away) {
    const score = (t: Spot) => (t.i - player.i) ** 2 + (t.j - player.j) ** 2
    to = near.reduce((a, b) => (score(b) > score(a) ? b : a))
  }
  dog.path = route(here, to, free)
  dog.step = 0
  dog.speed = away ? TROT : WALK
}

/** Moves Katsu on by dt seconds. Call once a frame while the room is showing and nothing's paused. */
export function tickDog(dt: number) {
  if (dog.hearts >= 0) dog.hearts += dt
  if (STAY && dog.sit <= 0) {
    dog.moving = false
    return
  }
  const dx = playerPos.x - dog.x
  const dz = playerPos.z - dog.z
  const toPlayer = Math.sqrt(dx * dx + dz * dz)
  if (dog.sit > 0) {
    dog.sit -= dt
    dog.moving = false
    dog.heading = Math.atan2(dx, dz)
    return
  }
  // Bumped into: trot off, away from the player.
  if (toPlayer < RADIUS + PILL_RADIUS + TOUCH && dog.speed !== TROT) setOff(true)
  dog.moving = dog.step < dog.path.length
  if (!dog.moving) {
    dog.speed = WALK
    dog.wait -= dt
    if (dog.wait <= 0) {
      dog.wait = PAUSE[0] + Math.random() * (PAUSE[1] - PAUSE[0])
      setOff(false)
    }
    return
  }
  const t = centre(dog.path[dog.step])
  const tx = t.x - dog.x
  const tz = t.z - dog.z
  const d = Math.sqrt(tx * tx + tz * tz)
  // The player in the way just ahead: wait for them (unless it's trotting away from them).
  if (dog.speed === WALK && toPlayer < RADIUS + PILL_RADIUS + 0.3 && dx * tx + dz * tz > 0) {
    dog.moving = false
    return
  }
  const move = dog.speed * dt
  if (d <= move) {
    dog.x = t.x
    dog.z = t.z
    dog.step++
  } else {
    dog.x += (tx / d) * move
    dog.z += (tz / d) * move
    dog.heading = Math.atan2(tx, tz)
  }
}

/** Petting: it sits facing the player, wags, woofs and hearts float up. The first time, a word about it. */
export function pet() {
  dog.sit = SIT
  dog.path = []
  dog.hearts = 0
  woof()
  if (firstTime('dog')) say(['This is Katsu, the house shiba.', 'Katsu leans right into the scratch, tail going like mad.'])
}
