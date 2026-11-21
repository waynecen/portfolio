import { Color, Vector3 } from 'three'
import { winter } from './season'

// Time of day and weather, from the visitor's own clock. The day is split into slots; each has a
// fixed look and weather and blends in from the previous slot over its first BLEND hours.
// Add ?hour=21 to the URL to see a given hour (decimals work: 16.75 is 4:45pm).

export type Weather = 'mist' | 'clear' | 'rain' | 'golden' | 'night'

type Slot = {
  name: string
  /** Hour the slot starts, 0–24. */
  start: number
  weather: Weather
  background: string
  fog: string
  /** Fog distances from the camera. The ground under the player is about 17 away. */
  fogNear: number
  fogFar: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  sun: string
  sunIntensity: number
  /** Where the sun (or moon) shines from, relative to what it lights. */
  sunFrom: [number, number, number]
  water: string
  /** Surf colour; dimmed at night so it doesn't glow on dark water. */
  foam: string
}

/** In start order. Night wraps past midnight to dawn. */
export const SLOTS: Slot[] = [
  {
    name: 'dawn', start: 5, weather: 'mist',
    background: '#d9d0d6', fog: '#e4dde0', fogNear: 11, fogFar: 30,
    hemiSky: '#f3dfe3', hemiGround: '#8a9a88', hemiIntensity: 1,
    sun: '#ffc9a8', sunIntensity: 1, sunFrom: [-8, 4, 3],
    water: '#7ea3b5', foam: '#ffffff',
  },
  {
    name: 'morning', start: 8, weather: 'clear',
    background: '#cfe8d5', fog: '#cfe8d5', fogNear: 60, fogFar: 140,
    hemiSky: '#ffffff', hemiGround: '#88aa77', hemiIntensity: 1.2,
    sun: '#ffffff', sunIntensity: 1.5, sunFrom: [5, 10, 4],
    water: '#5aa7c7', foam: '#ffffff',
  },
  {
    name: 'afternoon', start: 12, weather: 'rain',
    background: '#a9b7bf', fog: '#a9b7bf', fogNear: 22, fogFar: 58,
    hemiSky: '#d6e0e6', hemiGround: '#7d9077', hemiIntensity: 1.05,
    sun: '#e6eef5', sunIntensity: 0.8, sunFrom: [3, 10, 5],
    water: '#4f8aa3', foam: '#e8eef2',
  },
  {
    name: 'evening', start: 17, weather: 'golden',
    background: '#f2d3a6', fog: '#f0cfa0', fogNear: 40, fogFar: 100,
    hemiSky: '#fff0dc', hemiGround: '#8a9a70', hemiIntensity: 1.1,
    sun: '#ffc58a', sunIntensity: 1.4, sunFrom: [-7, 5, 6],
    water: '#6a9fb8', foam: '#fff1dc',
  },
  {
    name: 'night', start: 20, weather: 'night',
    background: '#0f1a2e', fog: '#0f1a2e', fogNear: 24, fogFar: 60,
    hemiSky: '#7389c0', hemiGround: '#2a3a34', hemiIntensity: 0.95,
    sun: '#a9bcff', sunIntensity: 0.8, sunFrom: [4, 10, -3],
    water: '#1f3c5c', foam: '#6f86a8',
  },
]

/** Hours each slot takes to blend in from the one before. */
export const BLEND = 0.5

/** The sampled look for one moment. Filled in place by sample(). */
export type Sky = {
  background: Color
  fog: Color
  fogNear: number
  fogFar: number
  hemiSky: Color
  hemiGround: Color
  hemiIntensity: number
  sun: Color
  sunIntensity: number
  sunFrom: Vector3
  water: Color
  foam: Color
  /** How much of each weather is showing, 0–1. They sum to 1. */
  weather: Record<Weather, number>
}

export function createSky(): Sky {
  return {
    background: new Color(), fog: new Color(), fogNear: 0, fogFar: 0,
    hemiSky: new Color(), hemiGround: new Color(), hemiIntensity: 0,
    sun: new Color(), sunIntensity: 0, sunFrom: new Vector3(),
    water: new Color(), foam: new Color(),
    weather: { mist: 0, clear: 0, rain: 0, golden: 0, night: 0 },
  }
}

// The slots with their colours parsed once, so sampling allocates nothing.
const parsed = SLOTS.map((s) => ({
  ...s,
  c: {
    background: new Color(s.background), fog: new Color(s.fog), hemiSky: new Color(s.hemiSky),
    hemiGround: new Color(s.hemiGround), sun: new Color(s.sun), water: new Color(s.water), foam: new Color(s.foam),
  },
  from: new Vector3(...s.sunFrom),
}))
const COLOURS = ['background', 'fog', 'hemiSky', 'hemiGround', 'sun', 'water', 'foam'] as const
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Fills `out` with the look at `hour` (0–24). */
export function sample(hour: number, out: Sky): Sky {
  const h = ((hour % 24) + 24) % 24
  let n = parsed.length - 1 // before the first slot's start, it's still last night
  for (let k = 0; k < parsed.length; k++) if (parsed[k].start <= h) n = k
  const cur = parsed[n]
  const prev = parsed[(n + parsed.length - 1) % parsed.length]
  const t = Math.min(1, ((h - cur.start + 24) % 24) / BLEND)

  for (const key of COLOURS) out[key].lerpColors(prev.c[key], cur.c[key], t)
  out.fogNear = lerp(prev.fogNear, cur.fogNear, t)
  out.fogFar = lerp(prev.fogFar, cur.fogFar, t)
  out.hemiIntensity = lerp(prev.hemiIntensity, cur.hemiIntensity, t)
  out.sunIntensity = lerp(prev.sunIntensity, cur.sunIntensity, t)
  out.sunFrom.lerpVectors(prev.from, cur.from, t)
  for (const w in out.weather) out.weather[w as Weather] = 0
  out.weather[prev.weather] += 1 - t
  out.weather[cur.weather] += t
  if (winter) chill(out)
  return out
}

// Winter (season.ts): a cooler, paler light, with the snow bouncing light back up from the ground.
// Less by night, so the dark stays dark.
const WINTER_AIR = new Color('#dfe7ee')
const WINTER_BOUNCE = new Color('#c9d4df')
const WINTER_SUN = new Color('#eef3ff')
function chill(out: Sky) {
  const day = 1 - out.weather.night
  out.background.lerp(WINTER_AIR, 0.45 * day)
  out.fog.lerp(WINTER_AIR, 0.45 * day)
  out.hemiGround.lerp(WINTER_BOUNCE, 0.7 * day + 0.2)
  out.sun.lerp(WINTER_SUN, 0.4 * day)
}

// ?hour= overrides the clock, for testing and the snapshot skill.
const override = (() => {
  const v = new URLSearchParams(location.search).get('hour')
  const n = v === null ? NaN : Number(v)
  return Number.isFinite(n) ? n : null
})()

/** The hour now on the visitor's clock (with minutes as a fraction), or the ?hour= override. */
export function currentHour(): number {
  if (override !== null) return override
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

/** The look right now. Atmosphere.tsx refreshes it every few seconds; the weather effects read it. */
export const sky = sample(currentHour(), createSky())
