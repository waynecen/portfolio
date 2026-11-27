import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

// A steady frame rate on every device: one look for everyone, and the resolution adapts instead.
//
// It moves up and down a ladder of rungs, each a pixel ratio and a multisampling level (the
// antialiasing in world/PostFX.tsx). The top rung multisamples fully; the first step down keeps the
// resolution and halves the samples, which costs the least sharpness for what it saves, and only
// then does the resolution come down. Never above the screen's own pixel ratio.
//
// What costs is the pixel count (the scene, its multisampling and the finishing pass are all drawn
// per pixel), so a big window is held to a budget: a ratio is only used if it draws at most
// MAX_PIXELS, and ratios under 1 are there for big windows only, never drawing fewer than MIN_PIXELS
// (so a phone stays sharp). Both are worked out again on a resize.
//
// Every WINDOW seconds it looks at the frames: if the average is slow, or too many frames came late
// (a missed refresh: the stutter that a fine average hides, like 55 fps on a 60 Hz screen), it drops
// a rung. If every frame was on time it climbs one back, but not within `hold` seconds of a drop; a
// climb that has to drop again straight away doubles `hold`, so it settles rather than flapping.

const STEPS = [0.5, 0.6, 0.75, 1, 1.25, 1.5] // device pixel ratios to choose between
const MAX_PIXELS = 2560 * 1440 // the most it draws at any ratio
const MIN_PIXELS = 1600 * 900 // ratios under 1 can't go below this
const SAMPLES = { full: 4, eased: 2, from: 1.25 } // multisampling: full on the top rung, eased below it, and always eased from this ratio up (the edges are fine already)
const WINDOW = 2 // seconds per check
const SLOW = 1 / 50 // average frame time that drops a rung (under ~50 fps)
const FAST = 1 / 80 // and that a fast screen (over 80 Hz) must beat to climb, as before: room to spare
const LATE = 0.08 // share of late frames that drops a rung
const LATE_AT = 1.5 // a frame is late at this many refreshes…
const LATE_MIN = 1 / 45 // …and never under this (so a fast screen's odd uneven frame doesn't count)
const ON_TIME = 0.01 // share of late frames at most, to climb
const HOLD = 12 // seconds after a drop before climbing again (doubled by each climb that fails)
const FAILED = 6 // a drop this soon after a climb means the climb failed
const SKIP = 0.25 // frames longer than this (a tab coming back, a hitch) aren't counted
const MAX_FRAMES = 1024 // frame times kept per window

/** The multisampling the canvas should use now; world/PostFX.tsx reads it each frame. */
export const quality = { samples: SAMPLES.full }

type Rung = { dpr: number; samples: number }

/** The rungs this window may use, cheapest first. */
function ladder(width: number, height: number): Rung[] {
  const area = Math.max(1, width * height)
  const screen = Math.max(1, window.devicePixelRatio)
  let lo = STEPS.indexOf(1)
  while (lo > 0 && area * STEPS[lo - 1] ** 2 >= MIN_PIXELS) lo--
  let hi = lo
  while (hi < STEPS.length - 1 && STEPS[hi + 1] <= screen && area * STEPS[hi + 1] ** 2 <= MAX_PIXELS) hi++
  // Over budget even at 1: come down until it fits (never under lo).
  if (hi === STEPS.indexOf(1)) while (hi > lo && area * STEPS[hi] ** 2 > MAX_PIXELS) hi--
  const rungs: Rung[] = []
  for (let i = lo; i <= hi; i++) rungs.push({ dpr: STEPS[i], samples: SAMPLES.eased })
  if (STEPS[hi] < SAMPLES.from) rungs.push({ dpr: STEPS[hi], samples: SAMPLES.full })
  return rungs
}

/** Mount once inside the Canvas. Starts at the top rung the window allows. */
export function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr)
  const size = useThree((s) => s.size)
  const s = useRef({
    rungs: [] as Rung[],
    rung: -1,
    w: 0,
    h: 0,
    time: 0,
    frames: 0,
    times: new Float32Array(MAX_FRAMES),
    sinceDrop: HOLD,
    sinceClimb: Infinity,
    hold: HOLD,
  }).current

  const go = (rung: number) => {
    const from = s.rungs[s.rung]
    s.rung = rung
    const to = s.rungs[rung]
    quality.samples = to.samples
    if (!from || from.dpr !== to.dpr) setDpr(to.dpr)
  }

  useFrame((_, delta) => {
    if (size.width !== s.w || size.height !== s.h) {
      // First frame, or a resize: start from the top of what this window allows.
      s.w = size.width
      s.h = size.height
      s.rungs = ladder(s.w, s.h)
      s.rung = -1
      s.hold = HOLD
      go(s.rungs.length - 1)
    }
    if (delta > SKIP) return
    if (s.frames < MAX_FRAMES) s.times[s.frames] = delta
    s.time += delta
    s.frames++
    s.sinceDrop += delta
    s.sinceClimb += delta
    if (s.time < WINDOW) return

    const kept = Math.min(s.frames, MAX_FRAMES)
    const average = s.time / s.frames
    // The screen's refresh: the frame time a fifth of the frames beat (most frames are on time on a
    // smooth screen, and even a struggling one hits some refreshes).
    s.times.fill(Infinity, kept).sort()
    const refresh = s.times[Math.floor(kept * 0.2)]
    const lateAt = Math.max(refresh * LATE_AT, LATE_MIN)
    let late = 0
    for (let k = 0; k < kept; k++) if (s.times[k] > lateAt) late++
    const lateShare = late / kept
    s.time = 0
    s.frames = 0

    if ((average > SLOW || lateShare > LATE) && s.rung > 0) {
      if (s.sinceClimb < FAILED) s.hold *= 2 // the rung it just tried is too much: wait longer before trying again
      s.sinceDrop = 0
      s.sinceClimb = Infinity
      go(s.rung - 1)
    } else if (
      lateShare <= ON_TIME &&
      average < Math.min(SLOW, Math.max(FAST, refresh * 1.1)) && // a 60 Hz screen climbs at its refresh; a fast one needs room to spare
      s.rung < s.rungs.length - 1 &&
      s.sinceDrop >= s.hold
    ) {
      s.sinceClimb = 0
      go(s.rung + 1)
    }
  })
  return null
}
