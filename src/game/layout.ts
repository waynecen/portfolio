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

/** Half-width of the doorway, the same inside and out. */
export const DOOR = 0.5

/** Where the game starts: beside the bed, facing the camera. In world units. */
export const BED_SPAWN: Spawn = { x: INTERIOR.x - 3, z: INTERIOR.z - 2, heading: 0 }

/** Tiles the house covers on the island (inclusive): 5 wide and 3 deep, at the centre of the map. */
export const HOUSE = { i0: -2, i1: 2, j0: -2, j1: 0 }

/** The outside door, in the middle of the house's front wall (the side facing the camera). */
export const FRONT_DOOR = { x: 0, z: HOUSE.j1 + 0.5 }

/** Coming out: one tile in front of the door, facing the camera. */
export const OUTSIDE_SPAWN: Spawn = { x: FRONT_DOOR.x, z: FRONT_DOOR.z + 1.1, heading: 0 }

/** Going in: just inside the doorway, on the rug, facing into the room. */
export const INSIDE_SPAWN: Spawn = { x: INTERIOR.x, z: INTERIOR.z + ROOM.hz - 1, heading: Math.PI }
