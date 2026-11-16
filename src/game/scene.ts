import { cameraSnap, teleport } from './state'
import { useGame, type Scene } from './store'

// Moving between areas (the house and the island): fade to black, swap the area and move the
// player while the screen is dark, then fade back in.

/** Seconds for each half of the fade: to black, then back. Matches `.fade` in style.css. */
export const FADE = 0.25

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

/** Where the player arrives in an area, and the way they face (radians; 0 = toward the camera). */
export type Spawn = { x: number; z: number; heading: number }

/** Puts the player in `scene` at `at` straight away, with no fade (e.g. where the game starts). */
export function arrive(scene: Scene, at: Spawn) {
  teleport.pending = true
  teleport.x = at.x
  teleport.z = at.z
  teleport.heading = at.heading
  cameraSnap.pending = true
  useGame.setState({ scene })
}

/** Takes the player to `scene`, placing them at `at`. Ignored while a fade is already running. */
export function goTo(scene: Scene, at: Spawn) {
  if (useGame.getState().fading) return
  if (reduced) {
    arrive(scene, at)
    return
  }
  useGame.setState({ fading: true })
  setTimeout(() => {
    arrive(scene, at)
    setTimeout(() => useGame.setState({ fading: false }), FADE * 1000)
  }, FADE * 1000)
}
