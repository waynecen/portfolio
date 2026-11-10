// Per-frame state shared between components, kept outside React (mutated in useFrame).
export const playerPos = { x: 0, z: 0 }

/** Velocity in units/s, plus speed as a 0..1 fraction of max walk speed. */
export const playerVel = { x: 0, z: 0, speed: 0 }

/** Direction the character faces (radians around Y; 0 = toward the camera). Written by the visuals. */
export const playerFacing = { heading: 0 }

/** Roll progress 0..1 while rolling, -1 otherwise; dir is the committed roll direction. */
export const playerRoll = { p: -1, dirX: 0, dirZ: 1 }
