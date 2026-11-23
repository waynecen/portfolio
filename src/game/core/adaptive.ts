import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

// A steady frame rate on every device: one look for everyone, and the resolution adapts instead.
// Every WINDOW seconds the average frame time is checked; over SLOW, the canvas drops a step of
// resolution, under FAST it climbs one back, but not within HOLD seconds of dropping, so it settles
// rather than flapping between two steps. Never above the screen's own pixel ratio.

const STEPS = [1, 1.25, 1.5] // device pixel ratios to choose between
const WINDOW = 2 // seconds per check
const SLOW = 1 / 45 // average frame time that drops a step (under ~45 fps)
const FAST = 1 / 80 // and that climbs one (over ~80 fps: room to spare)
const HOLD = 12 // seconds after a drop before climbing again
const SKIP = 0.25 // frames longer than this (a tab coming back, a hitch) aren't counted

const top = STEPS.filter((d) => d <= Math.max(1, window.devicePixelRatio)).length - 1

/** Mount once inside the Canvas. Starts at the top step the screen allows. */
export function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr)
  const s = useRef({ step: top, time: 0, frames: 0, sinceDrop: HOLD }).current

  useFrame((_, delta) => {
    if (delta > SKIP) return
    s.time += delta
    s.frames++
    s.sinceDrop += delta
    if (s.time < WINDOW) return
    const average = s.time / s.frames
    s.time = 0
    s.frames = 0
    if (average > SLOW && s.step > 0) {
      s.step--
      s.sinceDrop = 0
      setDpr(STEPS[s.step])
    } else if (average < FAST && s.step < top && s.sinceDrop >= HOLD) {
      s.step++
      setDpr(STEPS[s.step])
    }
  })
  return null
}
