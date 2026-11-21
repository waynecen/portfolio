# Secrets notes

Hidden things: pearls, the cave behind the waterfall, the islet, the trinkets and the calendar. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Secrets and the cave: [pearls.ts](./pearls.ts), [pois.ts](../world/pois.ts), [cave.ts](./cave.ts), [CaveRooms.tsx](./CaveRooms.tsx), [Waterfall.tsx](./Waterfall.tsx), [islet.ts](./islet.ts)

```ts
const SEED = 41        // pearls.ts: where the pearls go; DIG = 3 buried and GRASS = 3 under tall grass, AWAY = 6 apart and from the house
const NOTICE = [1.6, 2.6] // HiddenPearls.tsx: a buried pearl's earth shows fully within the first, not at all past the second
export const MAP_PRICE = 15 // shop.ts: the treasure map, which turns every buried pearl and the daily dig spot into a red cross
const SIGNS = 5        // pois.ts: at most this many signposts, SIGN_APART = 6 apart and SIGN_HOME = 4 from the house; PER_WAY = 3 names per arrow
const CORNER_HOME = 7  // pois.ts: a road's corner gets a post only this far from the house or further (a crossroads needs only SIGN_HOME)
export const OUTCROP = { i0: 6, i1: 8, j0: -16, j1: -15 } // layout.ts: the waterfall's rock, on the north shore; the mouth is CAVE_MOUTH
const TOP = 2.2        // Waterfall.tsx: the outcrop's height (LOWER = 1.4 for its front tier); FLOW = 1.4 how fast the water falls
export const CAVE = { x: 200, z: 0 } // layout.ts: where the cave is built, far off the island; rooms are CAVE_PITCH apart
export const ROOMS = [...] // cave.ts: the rooms on their grid, and the door on each side (open, exit, locked or bars)
export const BLOCK_START = { i: -1, j: 0 } // cave.ts: the push-block puzzle (PLATE, PILLARS, KEY_CHEST), in the blocks room's tiles
const PUSH_TIME = 0.3  // CaveRooms.tsx: seconds of leaning on the block before it moves; SLIDE_TIME = 0.28 for one tile
const BOSS_HP = 6      // CaveRooms.tsx: hits to pop the big slime; it hops faster below half
export const ISLET = { x: -10, z: 35, r: 4.5 } // Island.tsx: the islet's land, past BOUND so nothing scatters onto it
const CHEST_SHELLS = 20 // islet.ts: shells in the islet's sea chest
```

**Pearls.** Ten: three buried in the meadows, three under tufts of tall grass (cut the tuft and the pearl lies there; in winter they're buried instead), two on the tile just north of a tree, where the canopy hides them from the camera, one in the cave's last room and one buried on the islet. A buried pearl is a faint cross of earth that only shows up close, unless you have the treasure map. Found pearls are listed in the bag (`pearls-v1`); the tenth adds a record to the record player.

**Signposts.** Worked out from the roads at load: each crossroads (and corners far enough from home) gets a post on a diagonal tile beside it, with an arrow board for each way out that leads somewhere, naming the places that way.

**The cave.** Walk into the waterfall on the north shore. Four flip-screen rooms, the camera sliding between them: the first room has a locked door; the room to its east has a block to push onto the plate (hold a direction against it), which brings out a chest with the small key; behind the door the big slime waits behind bars, and popping it opens the bars and leaves a heart container (one more heart, for good); the last room has a chest with an oar, gold and a pearl. The block and the slime reset if you leave before finishing them; everything done is kept (`cave-v1`).

**The islet.** With the oar, the boat at the dock rows out to the islet (a fade), and the boat on the islet's shore rows back. On it: three trees, a carved sign, a sea chest of shells (`islet-v1`) and the last pearl. Pressing G there points to the boat.
