import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

// A steady frame rate on every device: one look for everyone, and the resolution adapts instead.
// Every WINDOW seconds the average frame time is checked; over SLOW, the canvas drops a step of
// resolution, under FAST it climbs one back, but not within HOLD seconds of dropping, so it settles
// rather than flapping between two steps. Never above the screen's own pixel ratio.
//
// Each step is a pixel ratio, but what costs is the pixel count (the scene, its multisampling and
// the finishing pass are all drawn per pixel), so a big window is held to a budget: a step is only
// used if it draws at most MAX_PIXELS, and steps under 1 are there for big windows only, never
// drawing fewer than MIN_PIXELS (so a phone stays sharp). Both are worked out again on a resize.

const STEPS = [0.5, 0.6, 0.75, 1, 1.25, 1.5] // device pixel ratios to choose between
const MAX_PIXELS = 2560 * 1440 // the most it draws at any step
const MIN_PIXELS = 1600 * 900 // steps under 1 can't go below this
const WINDOW = 2 // seconds per check
const SLOW = 1 / 50 // average frame time that drops a step (under ~50 fps: a 60 Hz screen missing frames)
const FAST = 1 / 80 // and that climbs one (over ~80 fps: room to spare)
const HOLD = 12 // seconds after a drop before climbing again
const SKIP = 0.25 // frames longer than this (a tab coming back, a hitch) aren't counted

/** The lowest and highest step this window may use. */
function range(width: number, height: number) {
  const area = Math.max(1, width * height)
  const screen = Math.max(1, window.devicePixelRatio)
  let lo = STEPS.indexOf(1)
  while (lo > 0 && area * STEPS[lo - 1] ** 2 >= MIN_PIXELS) lo--
  let hi = lo
  while (hi < STEPS.length - 1 && STEPS[hi + 1] <= screen && area * STEPS[hi + 1] ** 2 <= MAX_PIXELS) hi++
  // Over budget even at 1: come down until it fits (never under lo).
  if (hi === STEPS.indexOf(1)) while (hi > lo && area * STEPS[hi] ** 2 > MAX_PIXELS) hi--
  return { lo, hi }
}

/** Mount once inside the Canvas. Starts at the top step the window allows. */
export function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr)
  const size = useThree((s) => s.size)
  const s = useRef({ step: -1, time: 0, frames: 0, sinceDrop: HOLD, lo: 0, hi: 0, w: 0, h: 0 }).current

  useFrame((_, delta) => {
    if (size.width !== s.w || size.height !== s.h) {
      // First frame, or a resize: start from the top of what this window allows.
      s.w = size.width
      s.h = size.height
      const r = range(s.w, s.h)
      s.lo = r.lo
      s.hi = r.hi
      const step = s.step < 0 ? r.hi : Math.min(r.hi, Math.max(r.lo, s.step))
      if (step !== s.step) {
        s.step = step
        setDpr(STEPS[step])
      }
    }
    if (delta > SKIP) return
    s.time += delta
    s.frames++
    s.sinceDrop += delta
    if (s.time < WINDOW) return
    const average = s.time / s.frames
    s.time = 0
    s.frames = 0
    if (average > SLOW && s.step > s.lo) {
      s.step--
      s.sinceDrop = 0
      setDpr(STEPS[s.step])
    } else if (average < FAST && s.step < s.hi && s.sinceDrop >= HOLD) {
      s.step++
      setDpr(STEPS[s.step])
    }
  })
  return null
}
