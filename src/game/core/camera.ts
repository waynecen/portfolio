import { reducedMotion } from './settings'
import { cameraNudge, cameraShake } from './state'

// The camera's place above the player, and the moments that move it (a shake, a nudge), which
// CameraRig.tsx plays out.

export const HEIGHT = 8.7
export const DISTANCE = 9.65 // about 42°, still under 45°, so the curved horizon shows (curve.ts)

/** Shakes the camera for a moment (a big find, a hole in one). Nothing with reduced motion. */
export function shakeCamera(amount = 0.12) {
  if (reducedMotion()) return
  cameraShake.t = 0
  cameraShake.amount = amount
}

/** Leans the camera toward (x, z) and back (a hole in one, toward the cup). Nothing with reduced motion. */
export function nudgeCamera(x: number, z: number) {
  if (reducedMotion()) return
  cameraNudge.t = 0
  cameraNudge.x = x
  cameraNudge.z = z
}
