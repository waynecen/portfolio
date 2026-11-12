// The world is laid out on a square tile grid, like blocks: one tile is one world unit, and tile
// (i, j) is centred on x = i, z = j. Places, props and road tiles sit on tile centres; the player
// still moves freely between them.

export const TILE = 1

export type Tile = { i: number; j: number }

/** Nearest tile centre to a world position, in world units. */
export function snap(v: number): number {
  return Math.round(v / TILE) * TILE
}

/** The tile a world position falls in. */
export function tileAt(x: number, z: number): Tile {
  return { i: Math.round(x / TILE), j: Math.round(z / TILE) }
}
