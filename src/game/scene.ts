import { door } from './sfx'
import { cameraSnap, playerPos, teleport } from './state'
import { useGame, type Scene } from './store'
import { reducedMotion } from './settings'

// Moving between areas (the house and the island): fade to black, swap the area and move the
// player while the screen is dark, then fade back in.

/** Seconds for each half of the fade: to black, then back. Matches `.fade` in style.css. */
export const FADE = 0.25


/** Where the player arrives in an area, and the way they face (radians; 0 = toward the camera). */
export type Spawn = { x: number; z: number; heading: number }

/** Puts the player in `scene` at `at` straight away, with no fade (e.g. where the game starts). */
export function arrive(scene: Scene, at: Spawn) {
  teleport.pending = true
  teleport.x = at.x
  teleport.z = at.z
  teleport.heading = at.heading
  // Move the shared position now too, not only when Player.tsx next runs: the camera cuts to it
  // this frame, and if its update runs first (frame callbacks re-order when a component remounts,
  // e.g. on hot reload) it would cut to the old spot and glide across the map.
  playerPos.x = at.x
  playerPos.z = at.z
  cameraSnap.pending = true
  useGame.setState({ scene })
}

/** Takes the player to `scene`, placing them at `at`. Ignored while a fade is already running. */
export function goTo(scene: Scene, at: Spawn) {
  if (useGame.getState().fading) return
  door()
  if (reducedMotion()) {
    arrive(scene, at)
    return
  }
  useGame.setState({ fading: true })
  setTimeout(() => {
    arrive(scene, at)
    setTimeout(() => useGame.setState({ fading: false }), FADE * 1000)
  }, FADE * 1000)
}
