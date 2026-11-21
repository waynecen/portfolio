import { dayNumber } from '../secrets/calendar'
import { addShells } from '../combat/drops'
import { isInland, isLand } from '../world/Island'
import { say } from '../core/interact'
import { built, pois, roadTiles } from '../world/pois'
import { tileAt } from '../core/grid'
import { chime } from '../core/sfx'
import { trees } from '../world/Trees'
import { DOCK } from './fishing'

// Something new each day, seeded by the date (Daily.tsx draws them): a message bottle washed up on
// a different stretch of shore, holding a tip or a fun fact, and a dig spot somewhere in the grass
// with a few shells under it. Each can be used once a day; the browser remembers which day.

/** Tips and fun facts, one a day in turn. Placeholders: write your own. */
export const MESSAGES: string[][] = [
  ['“The fish bite more at dusk.”', 'Probably not true. But the evening light is nice on the water.'],
  ['“Every pillar on this island is a project.”', 'Walk up to one to read about it; use it to open it.'],
  ['“The roads all lead somewhere.”', 'So does the long grass, if you wade in.'],
  ['“Nothing here can be lost for good.”', 'Faint, and you wake at home. Leave for a month, and the island waits.'],
  ['“The island keeps your clock.”', 'Come back at night for the fireflies, or in the afternoon for the rain.'],
  ['“Some trinkets change the world. Harmlessly.”', 'Look behind things.'],
  ['“Shells are for spending.”', 'There’s a shop by the house. Hats are very important.'],
  ['“The cat who wrote this has never seen the sea.”', 'There is no cat on this island. Who wrote this?'],
]

/** Today, as a whole number of days (calendar.ts), and a seeded random from it. */
const day = dayNumber()
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = rng(day * 7919)

const key = (i: number, j: number) => `${i},${j}`
const roads = new Set(roadTiles.map((t) => key(t.i, t.j)))
const placeTiles = new Set(pois.map((p) => key(tileAt(p.x, p.z).i, tileAt(p.x, p.z).j)))
const treeTiles = new Set(trees.map((t) => key(Math.round(t.x), Math.round(t.z))))
const nearDock = (i: number, j: number) => Math.abs(i - DOCK.x) <= 2 && j >= DOCK.z0 - 2

function pick(list: { x: number; z: number }[]) {
  return list[Math.floor(random() * list.length)]
}

// The bottle: a shore tile (land at the cliff's edge), off the roads and away from the dock.
const shore: { x: number; z: number }[] = []
// The dig spot: open grass, off the roads, clear of trees, places and the house.
const meadow: { x: number; z: number }[] = []
for (let i = -30; i <= 30; i++)
  for (let j = -30; j <= 30; j++) {
    if (!isLand(i, j) || roads.has(key(i, j)) || placeTiles.has(key(i, j)) || treeTiles.has(key(i, j)) || built(i, j)) continue
    if (!isInland(i, j, 1)) {
      if (!nearDock(i, j)) shore.push({ x: i, z: j })
    } else if (isInland(i, j, 2)) meadow.push({ x: i, z: j })
  }

/** Where today's bottle and dig spot are. */
export const bottleAt = pick(shore)
export const digAt = pick(meadow)
const digShells = 3 + Math.floor(random() * 4)
const message = MESSAGES[((day % MESSAGES.length) + MESSAGES.length) % MESSAGES.length]

// Which day each was last used, kept in this browser.
const KEY = 'daily-v1'
function load(): { bottle: number; dig: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { bottle?: number; dig?: number }
    return { bottle: typeof v.bottle === 'number' ? v.bottle : -1, dig: typeof v.dig === 'number' ? v.dig : -1 }
  } catch {
    return { bottle: -1, dig: -1 }
  }
}
const used = load()
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(used))
  } catch {
    // private mode or storage full: forgotten when the page closes
  }
}

/** True until today's bottle has been read, and today's spot dug. */
export const bottleWaiting = () => used.bottle !== day
export const digWaiting = () => used.dig !== day

/** Reads today's bottle. */
export function readBottle() {
  used.bottle = day
  save()
  say(['There’s a note rolled up inside the bottle.', ...message, 'Another one might wash up tomorrow.'])
}

/** Digs up today's spot. */
export function dig() {
  used.dig = day
  save()
  addShells(digShells)
  chime()
  say([`You dig up ${digShells} shells!`, 'The ground looks like it might hide something else tomorrow.'])
}
