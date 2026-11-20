// Per-frame state shared between components, kept outside React (mutated in useFrame).
export const playerPos = { x: 0, z: 0 }

/** Velocity in units/s, plus speed relative to walking speed (0 = still, 1 = walking, up to 2 sprinting). */
export const playerVel = { x: 0, z: 0, speed: 0 }

/**
 * Direction the character faces (radians around Y; 0 = toward the camera). Written by the visuals.
 * Set `snap` to turn the character to `heading` at once instead of easing round to it.
 */
export const playerFacing = { heading: 0, snap: false }

/** Roll progress 0..1 while rolling, -1 otherwise; dir is the committed roll direction. */
export const playerRoll = { p: -1, dirX: 0, dirZ: 1 }

/** One-shot request to move the player: applied (and cleared) by <Player> on its next frame. */
export const teleport = { pending: false, x: 0, z: 0, heading: 0 }

/** Set to make the camera jump straight to its target on the next frame instead of easing there. */
export const cameraSnap = { pending: true }
