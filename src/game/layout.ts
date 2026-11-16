import type { Spawn } from './scene'

// Where the house sits, inside and out. One set of numbers shared by the house models, the doors,
// the camera and the roads.

/**
 * The interior is built here, far off the island, so nothing outside can collide with it or take
 * focus while you're indoors (only one area is drawn at a time). House-local x/z are added to this.
 */
export const INTERIOR = { x: 0, z: -200 }

/** Half-size of the room's floor in tiles: 5 × 3 makes it 11 tiles wide and 7 deep. */
export const ROOM = { hx: 5.5, hz: 3.5 }

/** Where the game starts: beside the bed, facing the camera. In world units. */
export const BED_SPAWN: Spawn = { x: INTERIOR.x - 3, z: INTERIOR.z - 2, heading: 0 }
