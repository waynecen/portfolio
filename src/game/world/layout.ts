import { ISLET } from './land'
import type { Spawn } from '../core/scene'

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


/** The notice board (NoticeBoard.tsx): on the city square (SQUARE below), at its corner nearest the shop. */
export const NOTICE_AT = { x: 10, z: -2 }

/** Pip's stall, the shop (Villagers.tsx, shop.ts): on the grass east of the house. A road leads to it (pois.ts). */
export const SHOP_AT = { x: 7, z: -1 }

/**
 * The city square east of the house, beside the shop: a paved square of tiles (inclusive) with a
 * fountain in its middle (CitySquare.tsx). A road comes in on its west side, at the fountain's row.
 */
export const SQUARE = { i0: 9, i1: 15, j0: -3, j1: 3 }
/** The fountain, in the middle of the square. */
export const FOUNTAIN = { x: (SQUARE.i0 + SQUARE.i1) / 2, z: (SQUARE.j0 + SQUARE.j1) / 2 }
/** True if tile (i, j) is paved square. */
export const inSquare = (i: number, j: number) => i >= SQUARE.i0 && i <= SQUARE.i1 && j >= SQUARE.j0 && j <= SQUARE.j1

/**
 * The waterfall (Waterfall.tsx): a rocky outcrop on the island's north shore, tiles i0..i1 × j0..j1
 * (inclusive), with water pouring down its front over the mouth of a cave. A road leads to the mouth.
 */
export const OUTCROP = { i0: 6, i1: 8, j0: -16, j1: -15 }

/** The cave's mouth, in the middle of the outcrop's front face (the side facing the camera). */
export const CAVE_MOUTH = { x: 7, z: OUTCROP.j1 + 0.5 }

/** Coming out of the cave: a tile in front of the waterfall, facing the camera. */
export const WATERFALL_SPAWN: Spawn = { x: CAVE_MOUTH.x, z: CAVE_MOUTH.z + 1.1, heading: 0 }

/**
 * The cave behind the waterfall (CaveRooms.tsx, cave.ts), built far off the island like the house. It's
 * a few rooms in a grid, each the size of the house's room; this is the middle of the first one.
 * Room (i, j) is centred at CAVE + (i × CAVE_PITCH.x, j × CAVE_PITCH.z); j counts north as negative.
 */
export const CAVE = { x: 200, z: 0 }
/** Centre to centre between neighbouring rooms: the room plus a wall a tile thick. */
export const CAVE_PITCH = { x: 2 * ROOM.hx + 1, z: 2 * ROOM.hz + 1 }

/** The cave room (i, j) that point (x, z) is in. */
export function caveRoom(x: number, z: number) {
  return { i: Math.round((x - CAVE.x) / CAVE_PITCH.x), j: Math.round((z - CAVE.z) / CAVE_PITCH.z) }
}

/** Going in: just inside the first room's doorway, facing in. */
export const CAVE_SPAWN: Spawn = { x: CAVE.x, z: CAVE.z + ROOM.hz - 1, heading: Math.PI }

/** The islet's boat, pulled up in the water off its north shore (islet.ts, IsletScene.tsx). */
export const ISLET_BOAT = { x: ISLET.x, z: ISLET.z - ISLET.r - 0.7 }
/** Where rowing out lands the player: on the islet's north shore, facing in. */
export const ISLET_SPAWN: Spawn = { x: ISLET.x, z: ISLET.z - ISLET.r + 0.9, heading: 0 }
