# World notes

The island itself: tiles, roads and places, trees, the city square, the notice board, the sky, seasons and weather. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Grid and roads: [grid.ts](../core/grid.ts), [pois.ts](./pois.ts), [Roads.tsx](./Roads.tsx)

```ts
export const TILE = 1 // grid.ts: size of one grid tile in world units; places, props and roads sit on tile centres
```

There's no map on purpose: the island is found by walking round it. `pois` in pois.ts is the one list of places: home, each project station, the About sign and the Contact mailbox. Add an entry, and place its object at the same whole-number x/z, to give it a road. A path one tile wide runs all the way round the house, and every road leaves it from the loop tile nearest its place. Roads are one tile wide and run in straight lines with at most one 90° corner. They go along the shorter axis first and stop on the tile next to the place. If that route would cross another place or the house, they take the other corner.

---

## Island, cliffs and trees: [land.ts](./land.ts), [Island.tsx](./Island.tsx), [forest.ts](./forest.ts), [Trees.tsx](./Trees.tsx), [PineModel.tsx](./PineModel.tsx), [treeLook.ts](./treeLook.ts)

```ts
export const ISLAND_RADIUS = 18 // land.ts: in tiles; every tile whose centre is closer than this to spawn is land, so the shore steps along tile edges
export const FOREST = { x: -17, z: -15, r: 12 } // the forest's land to the north-west: every tile closer than r to (x, z) is land too
export const WATER_Y = -1.2     // land.ts: water surface height, well below the grass; the cliffs fill the drop
const COURSES = 3               // Island.tsx: rows of stone blocks in each cliff face
const UNDERWATER = 0.4          // the cliff carries on this far under the water so its foot never shows a gap
const RIM_TOP = 0.04            // the pale capstone rim stands this far above the grass
const RIM_DEPTH = 0.16          // rim thickness, top to bottom
const RIM_IN = 0.14             // how far the rim reaches in over the grass
const RIM_OUT = 0.08            // how far the rim overhangs the cliff face
const STONE = [...]             // cliff block colours; each block picks one from a fixed hash, so the pattern never changes
const RIM = ...                 // capstone colour
const SEED = 7                  // forest.ts: change for a different (but still fixed) tree layout
const MAX_TREES = 70            // upper limit on the main island's scattered trees
const CLEARANCE = 1             // tiles kept free around every road tile, place and the house
const SHORE_GAP = 1             // tiles kept free between trees and the cliff edge
const MIN_SCALE = 0.8           // trees are randomly sized between these
const MAX_SCALE = 1.3
const MAX_TRUNK = 0.3           // Trees.tsx: most a trunk's collider grows, so the pill fits between forest trees corner to corner
const FOREST_DENSITY = 0.85     // forest.ts: share of the forest's tree spots that get one
const FOREST_SCALE = [1, 1.5]   // forest trees are sized between these: taller than the island's
const CLEARING = 3.5            // radius of the open clearing in the middle of the forest, in tiles
const HEIGHT = 2, WIDTH = 0.8   // PineModel.tsx: the pine model at scale 1, taller and narrower than its own shape (2 : 1) so it reads as a pine from above
const BRIGHT = 1.3              // its texture lifted to sit with the island's palette (not the snow)
const SNOW_FROM = 0.3, UP = [0.3, 0.6] // winter: whatever faces up above this share of its height holds snow
```

The island is two overlapping circles of land: the main one round the house, and the forest's to the north-west (top left). `BOUND` in land.ts is how far out either reaches, for anything that loops over every tile.

On the main island, trees never touch each other, diagonals included, so there's always a gap to walk through. The forest is packed: a tree on every other tile, like a chessboard's dark squares (`FOREST_DENSITY` of them), so they only ever meet corner to corner and you can always slip through on the diagonals. In its middle is a clearing, and a road leads there from the house (a `forest` place in pois.ts); the pine cone waits in it.

**The pine model** (PineModel.tsx) is every tree, drawn as one instanced mesh; while it downloads, placeholder cones stand in (a trunk and a cone, two instanced meshes, in Trees.tsx). It isn't behind the loader (the game starts indoors). Its foliage is the only green in its texture, so in spring and autumn that alone takes the tree's `canopyColor` (keeping the texture's light and dark, scaled from `GREEN`); in summer and winter the texture shows as it is. Its positions are turned to floats before it's stretched: the pipeline stores them as 16-bit integers that only reach -1 to 1. A new tree model needs green foliage and a trunk that isn't green. Trunk colliders don't change with the model.

---

## City square: [CitySquare.tsx](./CitySquare.tsx), [layout.ts](./layout.ts)

```ts
export const SQUARE = { i0: 9, i1: 15, j0: -3, j1: 3 } // layout.ts: the paved square east of the house, by the shop; FOUNTAIN is its middle
export const NOTICE_AT = { x: 10, z: -2 } // layout.ts: the notice board, on the square's corner nearest the shop
const BASIN_R = 1.15   // CitySquare.tsx: the fountain's basin (and its collider); BASIN_H = 0.42 tall
const DROPS = 10       // droplets falling from the top bowl, each DROP_TIME = 0.7 s
const LAMP_GLOW = 1.4  // the corner lamps' glow at night (× sky.weather.night)
```

The square is a place in pois.ts, so a road leads to it; the road stops where the paving starts, and no other road crosses it. Nothing scatters onto it (`built()` in pois.ts) and trees keep a tile back. Footsteps on it sound like the road. Benches face the fountain on three sides, with a lamp post at each corner. **Make a wish** at the fountain: it costs one shell and fills every heart.

---

## Time of day and weather: [sky.ts](./sky.ts), [Atmosphere.tsx](./Atmosphere.tsx), [Rain.tsx](./Rain.tsx), [Fireflies.tsx](../life/Fireflies.tsx)

The island follows the visitor's own clock. `SLOTS` in sky.ts splits the day into five parts, each with a fixed look and weather:

| Slot      | Starts | Weather                                        |
| --------- | ------ | ---------------------------------------------- |
| dawn      | 05:00  | mist: fog close in, so the far trees fade out  |
| morning   | 08:00  | clear (the original look)                      |
| afternoon | 12:00  | rain                                           |
| evening   | 17:00  | golden: warm, low sun                          |
| night     | 20:00  | night: dark blue, fireflies, lit house windows |

Each slot sets the background, fog colour and distances, hemisphere light, sun colour, strength and direction, water and surf colour. Fog distances are measured from the camera; the ground under the player is about 17 away, so `fogNear` below that fogs the player too.

```ts
export const BLEND = 0.5           // sky.ts: hours each slot takes to blend in from the one before
const RECHECK = 5                  // Atmosphere.tsx: seconds between reads of the clock
const ROOM_DAY / ROOM_NIGHT        // Atmosphere.tsx: indoor lights by day and at night (blended by how much it's night)
const COUNT = tier low ? 300 : 800 // Rain.tsx: streaks; SPEED = 14, LENGTH = 0.45, SLANT = 0.12, OPACITY = 0.5
const SPREAD_X = 15, SPREAD_Z = 13 // Rain.tsx: area round the player that rain falls in
const COUNT = 55                   // life/swarm.ts: fireflies; SIZE = 0.3, WANDER = 0.5, HEIGHT = 0.45, BOB = 0.25
const GLOW = 1.1                   // House.tsx: window glow at full night
```

**Seeing a given hour:** add `?hour=21` to the URL. Decimals work, so `?hour=16.75` is 4:45pm. The snapshot skill shoots each slot this way.

**Seasons:** [season.ts](./season.ts) picks the season from the visitor's month (northern hemisphere: December to February is winter). Only winter changes the island so far:

- snow on the ground, on every tree's tiers and on the roof (`GROUND` in Island.tsx, `SNOW_FROM` in PineModel.tsx and `capGeometry` for the cones in Trees.tsx, house/snow.ts and `O.roof` for the blocks in House.tsx)
- snow falling all day instead of rain, heavier in the afternoon slot ([Snow.tsx](./Snow.tsx): `LIGHT`, `SPEED`, `SWAY`, `SIZE`)
- a cooler, paler light with snow bouncing light up from the ground (`chill` and the `WINTER_*` colours in sky.ts)
- crunchy footsteps (the `snow` sound in sfx.ts), puffs of snow instead of dust, and no fireflies

Add `?season=winter` to the URL to see it (or `spring`, `summer`, `autumn`). The snapshot skill pins every shot to summer, plus one winter shot.

With reduced motion, the colours and fog still change, but rain and fireflies hold still.

---

## Shadows and the finishing pass: [shadowBox.ts](./shadowBox.ts), [Shadows.tsx](./Shadows.tsx), [PostFX.tsx](./PostFX.tsx)

```ts
export const BOX = 13      // shadowBox.ts: half-size of the sun's shadow box, which follows the player everywhere (26 × 26 units)
export const MAP = 2048    // shadow map size; one texel is BOX × 2 / MAP (about 1.3 cm), and the box snaps to whole texels so edges don't shimmer
const BIAS = -0.0004, NORMAL_BIAS = 0.025 // against acne (stripes) without lifting shadows off their casters
const SWEEP = 1            // Shadows.tsx: seconds between sweeps that set new meshes casting and receiving
const BLOOM = { threshold: 0.9, smoothing: 0.25, intensity: 0.7, radius: 0.65 } // PostFX.tsx: only what's brighter than white once lit blooms
const VIGNETTE = { offset: 0.32, darkness: 0.42 }
const SAMPLES = 4          // multisampling in the composer, in place of the canvas's antialiasing
const GRADE = {...}        // brightness, contrast, saturation per weather (blended by sky.weather), and for the room and the cave
```

Shadows are PCF (`shadows="percentage"` on the Canvas: three has dropped its soft variant), softened by the shadow's `radius` (3). The sun (Atmosphere.tsx) is the only light that casts; lanterns and the player's glow don't (a point light's shadow is six passes). Every opaque mesh casts and receives, set by the sweep, so new things need nothing. To keep something out, give it, or any group it sits in, `userData.noShadow`; transparent and unlit (basic) materials are left out already. The curve isn't applied in the shadow pass (core/curve.ts), so far shadows stay under their casters.

PostFX draws every frame through one composer: the scene, then bloom, ACES tone mapping, the grade and the vignette in one merged pass. The renderer's own tone mapping and antialiasing are off (`flat` and `antialias: false` on the Canvas in Game.tsx), so neither is done twice. The `postprocessing` library is in the game chunk only.

---

## The sea: [Sea.tsx](./Sea.tsx)

```ts
const SIZE = 400, SEGMENTS = 160 // the plane, with vertices every 2.5 units so it bends with the curved world (one big square would tilt below the cliffs)
const PER_UNIT = 4               // distance-to-land map texels per unit, baked once at load
const REACH = 3                  // distances are stored up to this far from land
const FOAM_EDGE = 0.25           // the solid foam line where water meets cliff
const WAVES = 1.8                // how far out the rolling wave lines reach
const WAVE_SPACING = 0.55, WAVE_SPEED = 0.6 // between wave lines, and how fast they roll in
const RIPPLE = 0.12              // how much the ripples tilt the surface (the light shifts across it)
const GLINT = { day: 2.4, night: 0.35 }, GLINT_TIGHT = 140 // sparkles off the ripples, thinned by a moving noise mask
const OBSTACLES = [...]          // the dock's posts and the two moored boats, counted as land so they get foam rings
```

The sea is a Lambert plane with its own shader patch, so it keeps the island's light, shadows (it receives, never casts), curve and fog. Its colour is `waterMaterial`'s (land.ts), which Atmosphere.tsx tints for the time of day; the fountains use that material as it is. Foam follows the real coastline from the baked map: move a post or a boat and update `OBSTACLES`. With reduced motion the water holds still.

---

## Sky and air: [SkyDome.tsx](./SkyDome.tsx), [LightShafts.tsx](./LightShafts.tsx), [haze.ts](../core/haze.ts)

```ts
const RADIUS = 150                // SkyDome.tsx: the dome round the camera
const ZENITH = '#7fb2e0', ZENITH_MIX = 0.35 // the zenith leans this way from the slot's background (not at night)
const DRIFT = 0.006               // cloud drift per second
const COVER = { clear: 0.55, rain: 0.25 } // noise level above which there's cloud: lower = more cloud
const SPOTS = [...]               // LightShafts.tsx: where each shaft meets the ground, round the player (5)
const LENGTH = 9, WIDTH = 0.45    // a shaft's size, up the sun's direction
const STRENGTH = 0.1              // its brightness at full golden or misty light (additive)
const BREATHE = 0.35              // how much each narrows and widens, slowly
```

The dome goes from the fog colour at the horizon, so the far island fades into it with no seam, up to a deeper zenith, with soft clouds; the camera looks down, so it shows as the strip above the curved horizon. Rain brings more, greyer cloud; at night they're faint. Light shafts show at dawn and in the evening, slanting down the sun's direction and turned to the camera about their length; none in the morning, in rain or at night. The height fog (core/haze.ts) pools mist low over the water and the far, curved-away land.

---

## Free tiles: [tiles.ts](./tiles.ts)

Everything scattered over the island (grass, pickups, slimes, pearls, the daily finds) asks `clear(i, j, margins)` whether a tile is free: on land (`inland` tiles in from the shore, default 1), off roads and built tiles, and clear of places (`place`, default 1 tile round), trees (`tree`, default 0, and `behind` for the canopy's shadow towards the camera) and the house (`house`, default 0). `nearPath(i, j, ring)` is for keeping away from roads and places. Trees place themselves (Trees.tsx), so they keep their own clearings.
