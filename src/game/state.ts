// Per-frame state shared between components, kept outside React (mutated in useFrame).
export const playerPos = { x: 0, z: 0 }

/** Velocity in units/s, plus speed as a 0..1 fraction of max speed. */
export const playerVel = { x: 0, z: 0, speed: 0 }
