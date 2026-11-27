# Life notes

Island life: villagers and the tour, bugs, fishing, the shop, daily finds and the things to find for the bag. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Bag and items to find: [inventory.ts](./inventory.ts), [Pickups.tsx](./Pickups.tsx), [InventoryPanel.tsx](../ui/InventoryPanel.tsx)

```ts
export const ITEMS = [...] // inventory.ts: every item: id, name, description, colour and the tile it waits on (i, j)
const SAVE_KEY = 'inventory-v1' // localStorage key for what's been found; change it to forget every save
const RANGE = 1.1  // Pickups.tsx: how close the player must be to pick an item up
const SIZE = 1.5   // scale on every item's shape, so it shows from across the island
const FLOAT = 0.45 // how high items float over the grass
const BOB = 0.06   // and how far they bob
const SPIN = 1.2   // radians per second they turn; with reduced motion they hold still
const GLOW = 0.3   // share of its colour each item gives off, so it shows at night
const SHADE = 3    // tiles behind (north of) a tree that items keep clear of, since the camera looks north
const COLUMNS = 3  // InventoryPanel.tsx: slots per row; matches .bag-slots in ui/panels.css
```

B (or the Bag button at the bottom centre, with its bag icon; phones use Bag in the touch menu, since their B button sprints) opens the bag: a slot per item, a question mark until it's found, and the chosen item's name and words below. Arrow keys move between slots; B, Esc or × closes it.

An item's `at` is only where it would like to be. If that tile is a road, a place or its neighbours, the house, or near a tree, it moves to the nearest clear tile, so moving roads or reseeding trees never buries one. Picking one up plays `chime` (sfx.ts) and says what it is; the first find also says how to open the bag.

**Adding an item:** add its id to `ItemId` and an entry to `ITEMS`, then give it a shape in `SHAPES` (Pickups.tsx) and an icon in `ICONS` (InventoryPanel.tsx), a small picture on a 24 × 24 grid. Bag styles are `.bag-*` in [style.css](../../style.css).

On touch screens the bag is condensed to fit between the top chips and the touch controls: six slots to a row instead of three (`COLUMNS` in InventoryPanel.tsx and the `(pointer: coarse)` rules in style.css use the same media query). While any panel is open, the joystick and buttons are hidden (`data-panel` on `<body>`, set in Game.tsx).

Below the items, the bag lists every kind of fish (see Fishing). Arrow keys run on from one grid into the other, so keep `ITEMS` a multiple of `COLUMNS`.

---

## Fishing: [fishing.ts](./fishing.ts), [Dock.tsx](./Dock.tsx)

```ts
export const DOCK = { x: -9, half: 0.7, z0: 15.5, z1: 19.5 } // fishing.ts: the dock's centre line, half-width, and where it leaves the shore and ends
export const DOCK_ROOT = { x: -9, z: 15 }  // the land tile it leaves from; a road leads here (a 'dock' place in pois.ts)
export const BARREL_AT = { x: -8, z: 15.1 } // the barrel of rods
export const SPOTS = [...]                 // where the ripple can be; it moves to another after each catch
export const DECK_Y = 0.02                 // the landing's planks, flush with the grass (the player stands at 0 on both, so stepping on and off is level)
export const LOW_Y = WATER_Y + 0.3         // the low deck's planks, close to the water
export const STAIRS = { z0: 16.6, steps: 6, depth: 0.2 } // the flight down from the landing to the low deck; it starts past the grass beside the landing (to z 16.5), so no step can be walked onto from land
export const BOAT_SCALE = 1.25             // the rowing boats, drawn this much bigger than built (IsletScene.tsx); BOAT_HALF is their size. They float FLOAT = 0.11 over the water line, so their floor stays dry through the bob and roll; the dock boat's prompt is BOAT_RANGE = 0.45 from the deck's west edge, so the rest of the deck is for fishing (the nearest prompt wins)
export const DOCK_BOAT = { x: ..., z: 18.65 } // the boat at the dock, along the low deck's west (left) side
export const CAST_TIME = 0.55              // seconds for the float to fly out
const WAIT = [2.5, 6]                      // seconds before a bite, at random between these
const BITE_TIME = 0.9                      // seconds to hook it once it bites (ASSIST_BITE_TIME = 1.8 with the assist)
const LAND_PAUSE = 0.35                    // seconds between landing a fish and the words about it, so the moment lands first
const ZONE = 0.3                           // reeling: half-width of the green zone, in needle units (the bar runs -1..1); ASSIST_ZONE = 0.45
const PUSH = 3.4                           // how hard holding left or right pushes the needle (units/s²)
const PULL = [1.9, 4.2]                    // how hard the fish tugs: the weakest fish and the strongest (scaled by its fight); ASSIST_PULL = 0.7 of that
const TUG_EVERY = [0.25, 1.1]              // seconds between the fish changing direction
const EASE = [3, 10]                       // how sharply it turns to each new direction, at random: lazily or all at once
const LUNGE = [0.1, 0.3]                   // chance a turn is a lunge instead (weakest fish, strongest): LUNGE_PULL = 1.35 times as hard for LUNGE_TIME = 0.15–0.3 s
const DAMP = 2.4                           // how quickly the needle's swing dies away
const START = 0.25                         // the catch meter on hooking
const FILL = [0.24, 0.11]                  // meter filled per second in the zone: the weakest fish and the strongest
const DRAIN = 0.3                          // meter drained per second outside it
export const FISH = [...]                  // every fish: name, words, colour, how often it bites (weight) and its size range in cm
const SAVE_KEY = 'fish-v1'                 // localStorage key for catches; change it to forget them
const RANGE = 1.6                          // Dock.tsx: how close to the ripple the player must be to cast
const RIPPLE_R = 0.6                       // how far each ring of the ripple spreads, and RIPPLE_PERIOD = 2.2 s for one ring
const POSTS = [17, 18.3, ...]              // z of each pair of posts under the dock; keep them off land tiles
const ROD_LENGTH = 1.3                     // the rod in the player's hand; HOLD and FISHING_HOLD are how far it tips forward
```

The road ends at the foot of the dock, beside the barrel. Using the barrel takes a rod (or puts it back), and so does B on the keyboard, which reels in first if the line is out. On phones, a tap of B does it (holding B still sprints, and mid-reel a tap does nothing, so a stray one can't lose a fish); on a computer the **Put away rod** chip at the top right (`RodButton` in InventoryPanel.tsx, a `Chip` placed by `.rod-toggle` in ui/hud.css) does it too. It shows while a rod is in hand, except by the ripple, while the line is out, and while dialogue, a panel, a fade or edit mode is up. The rod isn't saved, so every visit starts without one. The ripple off the dock says to fetch a rod until you have one, then casts: the player turns to face it, the float flies out on its line, and after `WAIT` it nibbles, then bites with a splash and the prompt turns gold: **Hook it!** F, Space or A within `BITE_TIME` hooks it; too late and it gets away, too early and the line comes back empty. Esc reels in quietly. The player stands still while the line is out.

**Reeling it in** ([ReelBar.tsx](./ReelBar.tsx)): once hooked, a bar appears with a green zone in the middle and a needle the fish tugs back and forth, changing direction every `TUG_EVERY` seconds. Holding left and right (A and D, the arrow keys or the joystick) pushes back. While the needle is in the green, the catch meter fills (with a soft reel click) and it drains outside; fill it to land the fish. Let it drain, or let the needle reach an end of the bar (the line snaps), and the fish gets away. Each fish has a `fight` from 0 (the minnow) to 1 (the golden carp): it tugs harder and the meter fills more slowly. The assist widens the zone and softens the tugs. Each turn eases in at its own speed, and some are lunges (short, hard yanks, more often from strong fish), so the fish can't be read from a rhythm. Tuned in a simulation: doing nothing lands a minnow about 1 time in 4 and nothing stronger; a slow but attentive player lands the small fish every time, a red snapper 4 times in 5 and the golden carp about 1 time in 3; a quick player lands the carp 9 times in 10, in about 9 seconds. With the assist, the slow player lands everything. The float and rod follow the needle while reeling.

What bites is drawn by `weight`, and its length leans small, so big ones are rarer. Each catch is counted with its best size and shown in the bag.

**Feedback, and when it doesn't fire.** A kind of fish never caught before gets the `fanfare` (sfx.ts) and a brief camera zoom; a new biggest gets the zoom with the short `catch` blip; any other catch only the blip, so the hundredth minnow doesn't hold you up. The zoom never runs with reduced motion. Items found on the island keep the `chime`.

The dock is a landing at the grass, six steps down and a low deck close to the water, where the boat ties up on the left. The player walks down them: Player.tsx sets its height from `groundAt` (fishing.ts), which follows `dockHeight` through the middle of each step, so it needs no physics. The dock is a walkway: the water either side of it doesn't stop the player (`dockOpens` in fishing.ts, used by Player.tsx); thin colliders along its open sides and across its end do instead. Footsteps on it are `wood`. The sounds are `plop` (the float landing) and `splash` (a bite) in sfx.ts.

**Moving the dock:** change `DOCK` and `DOCK_ROOT` together, keep `POSTS` over water, and move `BARREL_AT`, `SPOTS` and `DOCK_BOAT` with it (no spot under the boat). Every spot must be within `RANGE` of somewhere on the deck but not of the shore.

---

## Island life: [Villagers.tsx](./Villagers.tsx), [bugs.ts](./bugs.ts), [daily.ts](./daily.ts), [shop.ts](./shop.ts), [season.ts](../world/season.ts)

```ts
const GUIDE_WALK = 1.5 // Villagers.tsx: Bramble's pace on the tour (a little under the player's); Mochi strolls at WALK = 1.2
const GIVE_WAY = 1.8   // units/s a villager steps aside at when the player presses into them
const TOUCH = 0.1      // how near counts as pressing, beyond the two bodies' radii
const EASE = 8         // how quickly stepping aside starts and stops (damp rate)
const AROUND = 0.7     // a walking villager starts curving round the player this far before reaching them
const TURN = 10        // how quickly a villager turns to face where it's going (damp rate)
const CATCH_UP = 2.6   // on the tour, how close the player comes before Bramble introduces a project; LOST = 14 for LOST_FOR = 10 s calls it off
const WANDER = 9       // Mochi strolls to road tiles this near the house, pausing PAUSE = 2–5 s
export const SHOP_AT = { x: 7, z: -1 } // layout.ts: Pip's stall; a road leads there (a 'shop' place in pois.ts)
export const HATS = [...] // shop.ts: hats for sale (name, price, colour); furniture for sale is every room piece with a price (room.ts)
const STEADY = 1.2     // bugs.ts: come at a bug faster than this (relative to walking) and it flees; MORPHO = 0.15, GOLDFLY = 0.08 rare chances
const COUNT = 6        // Butterflies.tsx: butterflies, on dry days outside winter; a caught or startled one is AWAY = 25 s
export const MESSAGES = [...] // daily.ts: the message bottle's notes, one a day in turn
const BLOSSOMING = 0.35 // Trees.tsx: share of trees in blossom in spring; AUTUMN = the turning colours; GROUND in Island.tsx by season
```

**Villagers.** Three neighbours walk the roads, finding their way with a breadth-first search over the road tiles, and never stand on the step outside the front door. **Bramble** (a frog) waits by the house; talk to Bramble for the guided tour: Bramble walks to the road beside each project in turn, waits until the player catches up, introduces it (its title and words from the HTML page), and moves on, walking only while the player keeps up. Wander more than `LOST` away for `LOST_FOR` seconds and the tour is off, to be picked up next time. **Mochi** (a rabbit) strolls about and chats; what Mochi says depends on what's in hand, the rain, the night and the season, with a real tip in each line. **Pip** (a hedgehog) keeps the shop at the stall east of the house.

Nobody can get stuck on a villager. Press into one and it walks aside, easing in and out, across the way the player faces (to whichever side it's already on) and a little away, never into anything solid or off the land. A walking villager curves round the player instead of into them, sliding round obstacles only while it curves (the roads are kept clear otherwise), and counts a tile as reached from a little way off so it never circles one. Villagers don't block each other. They turn smoothly to face where they're going. Pip, behind the stall, has no collider and needn't.

**Catching.** Butterflies flutter over the meadows by day (not in rain or winter) and fireflies glow at night. One "Catch" prompt follows whichever is nearest; walk up and use it. Rush in at a sprint and the bug gets away. Catches are counted in the bag's Bugs section (`bugs-v1`), beside the fish.

**Something new each day** (seeded by the date, `dayNumber()` in calendar.ts, so `?date=MM-DD` tries another day): a message bottle on a different stretch of shore holding the day's note, and a cross of dug earth in the grass with 3–6 shells under it. Each can be used once a day (`daily-v1`).

**The shop.** Shells buy hats (worn at once, then put on or taken off at the shop; `hats-v1`) and furniture: a paper lamp, a fern and a bookshelf (room.ts pieces with a `price`). A bought piece appears in the house at its default spot, or the nearest free tile, and can be moved like the rest in edit mode. Only owned pieces count in the room's rules (`placed()` in room.ts; `decor-v1`).

**Seasons.** Spring: fresh grass, a third of the trees in pink blossom, and a few petals drifting down. Autumn: golden grass, the trees turning orange, red and yellow, and a few falling leaves. Winter: snow, as before. Add `?season=spring` (or summer, autumn, winter) to the URL to see one.
