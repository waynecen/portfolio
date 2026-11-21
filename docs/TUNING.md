# Tuning reference

Every constant that changes how the game looks, moves or performs, grouped by system. Each block shows the code as it appears in the source, with a comment explaining what the value does. Change the value in the linked file, not here. If you add or rename a constant, update this page too.

**Units:** distances are in world units (one tile is one unit, the island is 35 tiles across, one screen is about 19 units wide, and the pill is about 1.2 tall). Times are in seconds. Angles are in radians (π ≈ 3.14 is half a turn).

**Damp rates:** several values are rates passed to `MathUtils.damp`, which eases a value toward a target. Higher is snappier. Roughly, a value covers 63% of the remaining gap in `1 / rate` seconds, so a rate of 10 gets 63% of the way in 0.1 s and is basically there by 0.3 s.

---

## Player movement: [src/game/Player.tsx](../src/game/Player.tsx)

```ts
const SPEED = 2.5 // walking speed, units/s (a full joystick push or any WASD key)
const SPRINT = 2.5 // holding Shift (or the B button on touch) multiplies top speed by this (2.5 → 6.25 units/s); also caps the animation's speed value
const ACCEL = 12 // damp rate toward the input velocity while a direction is held; lower = slidier, heavier starts
const DECEL = 16 // damp rate back to a stop after letting go; higher than ACCEL so stops feel crisp
const SHORE = 0.15 // the pill stops this far short of the cliff edge, so its feet stay on the rim
const EDGE = PILL_RADIUS + SHORE // derived, don't edit: how close the pill's centre gets to a water tile; must stay at most half a tile
```

### Roll

```ts
const ROLL_TIME = 0.45 // seconds one tumble lasts; movement input is ignored for this long
const ROLL_SPEED = 9 // burst speed at the start of the roll, units/s
const ROLL_COOLDOWN = 0.2 // seconds after a roll ends before another can start
const STEP_LEN = [0.45, 0.7] // units travelled per footstep sound, walking and at full sprint
```

Inside the roll, speed eases from `ROLL_SPEED` down to `ROLL_SPEED × 0.4` (the `0.6` in `1 - 0.6 * roll.p`). At 9 that ends at 3.6, just under `SPEED`, so the roll blends straight into walking. If you change `ROLL_SPEED` a lot, adjust that `0.6` too so the end speed stays close to `SPEED`.

Distance covered by one roll ≈ `ROLL_SPEED × 0.7 × ROLL_TIME`, about 2.8 units with the defaults.

---

## Character model: [src/game/models.ts](../src/game/models.ts), [src/game/ModelCharacter.tsx](../src/game/ModelCharacter.tsx)

```ts
export const PLAYER_MODEL: string | null = null // models.ts: path of the optimized model under public/, or null for the pill
export const PLAYER_HEIGHT = 1.2 // models.ts: the model is scaled to this height (about the pill's)
export const PLAYER_WIDTH = 1.2 // models.ts: widens the model side to side and front to back at the same height (1 = as modelled)
export const CLIPS = { idle: 'Idle', walk: 'Walk', run: 'Run' } // models.ts: clip names in the file; a missing one is skipped
const BLEND = 10 // ModelCharacter.tsx: how quickly idle, walk and run blend as speed changes (damp rate)
const WALK_RATE = [0.6, 1.25] // ModelCharacter.tsx: walk clip playback speed at a slow amble and at full walk, for a clip with no recorded pace
const MIN_RATE = 0.3 // ModelCharacter.tsx: slowest playback when matching a clip's pace to the ground speed
const MAX_RATE = 3 // ModelCharacter.tsx: fastest walk playback; past it the feet slide rather than step comically fast
const RUN_MAX_RATE = 2.75 // ModelCharacter.tsx: the same for the run (2.75× keeps pace up to a full sprint, 5 units/s)
const IDLE_PAUSE = 5 // ModelCharacter.tsx: seconds the model stands still after stopping, and between plays of its idle clip
const BREATHE = 0.012 // ModelCharacter.tsx: height swell while standing still (two slow breaths per pause)
const MODEL_LEAN = 0.12 // PillCharacter.tsx: the model's forward lean at full speed, radians (about 7°, 11° sprinting)
```

Walk and run play at the speed where their feet keep pace with the ground: `npm run models` records each clip's pace (body heights per second) when it strips the root motion, and the game divides the player's speed by it, within `MIN_RATE` and `MAX_RATE` (`RUN_MAX_RATE` for the run).

With a model set, the rig below still turns it and tumbles it through rolls (`TURN`, `ROLL_DROP`), and leans it into its movement (`MODEL_LEAN`, scaled up by `SPRINT_LEAN`), but the pill's body shape, walk cycle and feet no longer apply: the model's own clips do the walking. Making a model, the pipeline and the size budget are in [CHARACTER.md](CHARACTER.md).

---

## Around the player: [src/game/PlayerGround.tsx](../src/game/PlayerGround.tsx), [src/game/Dust.tsx](../src/game/Dust.tsx)

```ts
const SHADOW_SIZE = 0.85 // PlayerGround.tsx: blob shadow diameter, world units (the scene casts no real shadows)
const SHADOW_OPACITY = 0.35 // PlayerGround.tsx: how dark it is; it tightens and lightens a little mid-roll
const NIGHT_GLOW = 2.5 // PlayerGround.tsx: the warm light on the player at full night outdoors (0 by day)
const INDOOR_GLOW = 0.4 // PlayerGround.tsx: share of NIGHT_GLOW indoors, where the room is lamp-lit
const COUNT = 16 // Dust.tsx: puffs in the pool
const LIFE = 0.45 // Dust.tsx: seconds a puff lasts
const SIZE = 0.09 // Dust.tsx: a puff's radius at its biggest
const BURST = 6 // Dust.tsx: puffs when a roll starts
const TRAIL = 0.12 // Dust.tsx: seconds between puffs while sprinting
```

```ts
const SIZE = 0.075 // Sparkle.tsx: the gold glints circling whatever the player can use; also COUNT = 5, HEIGHT = 1.55, RADIUS = 0.32, SPIN = 1.4
const SPLASH_CHANCE = 0.2 // Rain.tsx: share of raindrops landing near the player that splash; SPLASH_LIFE = 0.28, SPLASH_SIZE = 0.16
```

Dust only shows outdoors and not in the rain. The light is always there, at 0 by day: adding or removing a light would recompile every material.

## Sound effects: [src/game/sfx.ts](../src/game/sfx.ts)

```ts
const LEVEL = 0.5 // effects relative to the music volume; the music's mute silences them too
const STEP_VOLUME = 0.45 // footsteps relative to the other effects
const ROLL_VOLUME = 0.5 // the roll's whoosh relative to the other effects
const WET_VOLUME = 0.7 // the splash layered under each footstep in the rain, relative to the step (Player.tsx: from WET_RAIN = 0.5 rain, outdoors, not in winter)
```

Every sound is synthesised in `SOUNDS` (no audio files): footsteps for grass, snow, road and tatami, the furniture thud (`wood`), the roll whoosh, the door, dialogue blips and clicks. Change a sound's pitch or length there.

To use real recordings instead, put the files in `public/sfx/` and list them in `FILES` in sfx.ts. Grass and tatami footsteps already do, e.g. `grass: ['/sfx/grass_L.wav', '/sfx/grass_R.wav']`. With several files a sound takes turns through them in order, so a left and a right step alternate. The names are `grass`, `snow`, `road`, `tatami`, `wood`, `whoosh`, `door`, `blip` and `click`. Any sound left out stays synthesised, and a file that fails to load falls back to it too.

---

## Character animation: [src/game/PillCharacter.tsx](../src/game/PillCharacter.tsx)

### Body shape

```ts
export const PILL_RADIUS = 0.35 // body thickness (radius of the capsule); also sets how close it can get to the floor edge
const PILL_LENGTH = 0.4 // height of the straight middle section between the two rounded ends
const PILL_HALF = PILL_RADIUS + PILL_LENGTH / 2 // derived, don't edit: half the body's total height
const BODY_BASE = 0.12 // how high the body's bottom sits off the floor, leaving room for the feet underneath
const CENTER = BODY_BASE + PILL_HALF // derived, don't edit: the tumble spins around this point
```

If you change the body size, also check the eye positions (`[±0.12, 0.72, 0.32]` in the JSX), so they stay on the front surface.

### Walk cycle

```ts
const STEP_RATE = 5 * Math.PI // how fast the walk cycle runs at full speed; 2π = one stride (two steps), so 5π = 2.5 strides/s
const BOB = 0.08 // how high the body hops on each step, units
const SQUASH = 0.06 // squash-and-stretch amount: stretches tall mid-step, squashes at each footfall (0.06 = ±6%)
const LEAN = 0.18 // forward tilt at full speed, radians (0.18 ≈ 10°)
const TURN = 14 // how quickly it turns to face the direction of travel (a damp-style rate; higher = snappier)
const STRIDE = 0.14 // how far each foot swings forward and back from its rest spot, units
const LIFT = 0.12 // how high a foot lifts at the middle of its swing, units
const BREATHE = 0.015 // idle breathing: gentle ±1.5% scale pulse while standing still
const SPRINT_LEAN = 0.6 // extra forward lean at full sprint (+60%, about 16° in total)
const SPRINT_STRIDE = 0.3 // longer foot swing at full sprint (+30%)
```

Sprinting also speeds up the steps, because the walk cycle advances in proportion to speed (2.5× faster at full sprint). `SPRINT_LEAN` and `SPRINT_STRIDE` fade in between walking and full sprint, and they're switched off during a roll.

**Foot sliding:** a foot stays still on the floor only when its backward slide matches walking speed. That's roughly `SPEED ÷ (STEP_RATE / π) ≈ 2 × STRIDE`. With the defaults the feet slide (cartoony, intentional). To reduce it, raise `STRIDE` or `STEP_RATE`. Raising `STEP_RATE` too high makes the walk look frantic.

The walk-weight fade (`MathUtils.damp(s.w, v.speed, 8, dt)`) uses a hard-coded rate of `8`. Lower it to make the walk ease in and out more gradually.

### Roll visuals

```ts
const TUCK = 0.22 // how much the body squashes into a ball mid-roll (0.22 = 22% shorter, wider to keep its volume)
const ROLL_DROP = 0.28 // how far the body's centre drops mid-roll so it tumbles along the floor instead of above it
```

The flip is one full turn (`flip * Math.PI * 2`). Change the `2` to `4` for a double flip.

### Feet

```ts
const FOOT_X = 0.18 // sideways distance of each foot from the centre line
const FOOT_Y = 0.07 // resting height of the feet's centre (about half their flattened height, so they sit on the floor)
const FOOT_Z = 0.06 // feet rest slightly forward of centre, so they poke out the front of the body
```

The feet's shape comes from `new SphereGeometry(0.14, …)` (size) and `scale={[1, 0.55, 1.35]}` (flattened and lengthened). The scale is also set every frame, so a shape change has to be made in both the JSX and the `footL/footR.current.scale.set(…)` lines.

### Accessibility

```ts
const MOTION = reduced ? 0.3 : 1 // with "reduce motion" turned on, bob, squash and lean play at 30% strength
```

### Colours

```ts
const eyeMat = new MeshLambertMaterial({ color: '#2b2b2b' }) // eyes
const footMat = new MeshLambertMaterial({ color: '#d9a536' }) // feet (a darker yellow than the body)
// body colour: <meshLambertMaterial color="#f2c14e" /> in the JSX
```

---

## Curved world: [src/game/curve.ts](../src/game/curve.ts)

```ts
export const CURVE = 0.02 // how fast the ground falls away behind the player; 0 turns the curve off
export const FLAT = 6 // units behind the player before the bend starts, so the ground you walk on (and the room indoors) stays flat
```

Everything past `FLAT` drops by `CURVE × distance²`, so the island rolls away over a horizon like a small planet. It's a patch to three's shared vertex step, so every material bends alike. Only how things look bends: positions, collisions and interactions are unchanged. A stronger curve or a lower camera shows more sky.

---

## Camera: [src/game/CameraRig.tsx](../src/game/CameraRig.tsx)

```ts
export const HEIGHT = 8 // how high the camera sits above the floor
export const DISTANCE = 10 // how far back (toward the viewer) it sits from the player; a little lower than 45°, so the curved horizon shows
const LAMBDA = 4 // follow rate: higher = camera sticks closer to the player, lower = floatier lag
const ZOOM = 0.18 // a catch's zoom: how much nearer the camera comes, as a share of its distance (cameraZoom in state.ts)
const ZOOM_TIME = 0.9 // seconds in and back out
const ROOM_MARGIN = 1 // indoors: black kept beside the room's side walls when the screen is wide enough
const ROOM_SHIFT = -0.5 // indoors: aim this far behind the room's centre so the tall back wall stays in view
```

To zoom, change `HEIGHT` and `DISTANCE` together. To make the view more top-down, raise `HEIGHT` relative to `DISTANCE`.

Indoors the camera holds still on the room. On a screen too narrow to show the whole room, it follows the player sideways, but never far enough to show past the walls.

Field of view is set in [Game.tsx](../src/game/Game.tsx): `fov: 35` (degrees). Lower is more zoomed-in and flatter, higher is wider and more distorted.

---

## Project stations: [src/game/Station.tsx](../src/game/Station.tsx), [src/game/projects.ts](../src/game/projects.ts)

```ts
const RANGE = 1.5 // Station.tsx: how close the player must be to a station for its project card to show
const RING = 5 // projects.ts: stations are spaced evenly around a circle of this radius, the first straight ahead of spawn
// Station.tsx: rotation.y += delta * 0.8 — spin speed of the marker's top, radians/s
const GLOW = '#ffd27a' // an unseen project's gem glows this colour, pulsing between GLOW_MIN = 0.25 and GLOW_MAX = 0.8 at PULSE = 2.2 rad/s
const SAVE_KEY = 'seen-v1' // seen.ts: localStorage key for the places seen; change it to forget them
```

The projects themselves aren't constants. They're read from the `#projects article` elements in [index.html](../index.html), so adding an `<article>` there adds a station.

**Places seen** ([seen.ts](../src/game/seen.ts)): every project, the About sign and the Contact mailbox is a place (`PLACES`). A place counts as seen once its card has shown (a project, the mailbox) or once it's been used (the sign, which has no card); an interactable names its place with `seen` when it registers. The list is saved in this browser and shown at the top of the bag ("2 of 3 projects seen"), and a project's gem glows until it's been seen. A project's place id is its title, so renaming one in index.html makes it unseen again.

**Where to?** ([guide.ts](../src/game/guide.ts), [GuideWind.tsx](../src/game/GuideWind.tsx)): G, or the Where to? chip at the top left, points the way to the nearest unseen project (then the About sign and the mailbox). The camera glides over to it and back (`PEEK = 2` seconds, gliding included; walking off ends it early) while wind streaks fly from the player toward it (`COUNT = 12` streaks over `STREAKS_FOR = 1.4` s, each `LIFE = 1` s at `SPEED = 4.5`, up to `LENGTH = 0.6` long). Indoors the streaks point to the door and the camera stays put. With everything seen, it says so and suggests the forest and the dock. The chip's style is `.guide-toggle` in style.css; the now-playing label sits under it.

**Welcome back** ([visits.ts](../src/game/visits.ts), [WelcomeBack.tsx](../src/game/WelcomeBack.tsx), [Leaves.tsx](../src/game/Leaves.tsx)): the browser keeps when the first and last visits were and how many there have been (`visits-v1`; a reload within `SAME_VISIT` = 30 minutes is the same visit). A returning visitor is greeted 1.5 s (`DELAY`) after the game shows, in words that depend on the days away (one, a few, over a week, a long time). From `MIN_DAYS = 2` days away, one pile of leaves per day blows in beside the roads within `NEAR = 9` tiles of the house, at most `PILES = 6`; walking within `SWEEP = 0.55` sweeps one up with a rustle, and the last plays the find chime. After a week or more, the greeting also points to Where to? if a project is still unseen. A first visit gets no greeting: the note by the bed does that.

**Calendar moments** ([calendar.ts](../src/game/calendar.ts), [Festive.tsx](../src/game/Festive.tsx)): on arriving, the island says a line on its birthday (`ISLAND_BIRTHDAY`, a placeholder set to 20 November; change it to the day the site went up), New Year's Day, Valentine's Day, Halloween, Christmas Eve and Day, and New Year's Eve, and thanks visitors on their 10th, 25th, 50th and 100th visit (`MILESTONES`). Pumpkins (Halloween), presents (Christmas) or balloons (the birthday) stand by the front door on those days. Between 2 and 5am (`NIGHT`), the About sign asks if you shouldn't be asleep before its words. Add `?date=MM-DD` to the URL to try a day, with `?hour=` for the time.

---

## About sign and Contact mailbox: [src/game/places.ts](../src/game/places.ts), [src/game/Mailbox.tsx](../src/game/Mailbox.tsx)

```ts
export const ABOUT_AT = { x: -6, z: -2 } // places.ts: the About sign, left of the house (whole numbers, so a road reaches it)
export const CONTACT_AT = { x: -1, z: 3 } // places.ts: the Contact mailbox, out front, just left of the path from the door
const RANGE = 1.4 // Mailbox.tsx: how close the player must be for the contact card to show
const RADIUS = 0.3 // Mailbox.tsx: collision radius
```

Like the projects, the words come from [index.html](../index.html). Each `<p>` in `#about` is one line the sign reads out. The links in `#contact` are listed on the contact card, and the mailbox opens the first one.

---

## Interactions and dialogue: [src/game/interact.ts](../src/game/interact.ts), [src/game/Dialogue.tsx](../src/game/Dialogue.tsx)

```ts
range: 1.4 // Furniture.tsx: how close the player must be to read the note (every interactable sets its own range)
const CHARS_PER_SECOND = 40 // Dialogue.tsx: typewriter speed; lines appear instantly with "reduce motion" on
const PAUSE_SENTENCE = 0.25 // Dialogue.tsx: extra pause (s) after . ! ? so the text reads like speech
const PAUSE_COMMA = 0.1 // Dialogue.tsx: extra pause (s) after , ; :
const MAX = 40 // log.ts: conversations kept in the dialogue log; older ones drop off
const LEAVE = 0.6 // Interactions.tsx: a dialogue closes once the player is this much beyond the range of what started it
const SAY_RANGE = 1.5 // interact.ts: the range used when nothing was in focus (it belongs to the spot it opened at)
```

Bubble look is in [style.css](../src/style.css): `.dialogue-cloud` `fill` (cream), `.dialogue` `color` (brown text), `.dialogue-next` `fill` (arrow), and the `dialogue-pop` keyframes (pop-in). The cloud outline is the SVG `path` in Dialogue.tsx; it stretches to fit, so it works at any width.

Anything the player can use calls `register({ x, z, range, prompt, onInteract })` in an effect. Each frame, the nearest one in range gets focus and shows its prompt ("E Read"), or its card if it has a `card` (a project, or the contact links; the card's `action` labels what using it opens). The player can keep walking while a dialogue is open: walking out of range of whatever started it closes it, so reading a sign never holds you in place. Panels, edit mode, the fade between areas and a fishing line out still hold the player still (`held()` in interact.ts). To add a sign, place `<Sign x z lines={[…]} />` in [Game.tsx](../src/game/Game.tsx). The welcome and controls text is the `NOTE` array in [Furniture.tsx](../src/game/Furniture.tsx), with a keyboard and a touch version.

**The log** ([log.ts](../src/game/log.ts), [LogPanel.tsx](../src/game/LogPanel.tsx)): every conversation this visit is kept, newest at the bottom; L (or Log in the bag) opens it, and L, Esc or × closes it. **Told once:** `sayFirst(key, first, again)` in interact.ts says the full `first` lines the first time this browser hears about `key`, and the short `again` lines after (saved under `told-v1`). The rod barrel and the ripple use it.

---

## Collision: [src/game/collision.ts](../src/game/collision.ts)

```ts
const BASE_RADIUS = 0.5 // Station.tsx: pedestal width, also its collision circle
addCollider({ kind: 'box', x, z, hx: 0.45, hz: 0.1 }) // Sign.tsx: half-width and half-depth of the sign's solid box
const TRUNK_RADIUS = 0.25 // Trees.tsx: tree collision circle at scale 1 (scaled with the tree)
PILL_RADIUS * 0.5 // Player.tsx: longest move per substep, so fast rolls can't pass through thin obstacles
```

The player is a circle of `PILL_RADIUS`. Obstacles are circles or axis-aligned boxes added with `addCollider(…)` in an effect (it returns its own cleanup). Each frame the player is pushed out of anything it overlaps, and the part of its velocity heading into the obstacle is dropped, so it slides along walls. Keep each interactable's `range` larger than its collider plus `PILL_RADIUS` (about 0.85 for a station), or the player won't be able to get close enough to use it.

---

## Record player and music: [src/game/RecordPlayer.tsx](../src/game/RecordPlayer.tsx), [src/game/music.ts](../src/game/music.ts)

```ts
const BACK = -0.15 // how far towards the back of its tile it stands (where it is comes from room.ts, like the other furniture)
const RANGE = 1.8 // how close the player must be to use it
const SPIN = 3.5 // platter speed while playing, rad/s (about 33 rpm); it spins up and winds down
const PULSE = 0.08 // how much the cabinet bounces to the music's low end (off with reduce motion)
const DEFAULT_VOLUME = 0.6 // music.ts: starting volume before the visitor changes it (then remembered); 0.6 = two waves
const WAVE_LEVELS = [0.33, 0.66] // MusicPanel.tsx: volume up to 0.33 shows 1 wave, up to 0.66 shows 2, above that 3; the icon toggles mute (0) and back
analyser.fftSize = 64 // music.ts: analyser resolution for the pulse; level() averages the lowest 8 bins
```

**Adding music:** put files in `public/audio/` and list them in [src/game/tracks.ts](../src/game/tracks.ts) (`title`, `artist`, `src`, optional `credit`). Use AAC (.m4a) or Opus at about 96 to 128 kbps. While that list is empty, [placeholderTracks.ts](../src/game/placeholderTracks.ts) generates three 16-second chord loops in the browser. Edit `SONGS` there to change them (MIDI note numbers, 60 = middle C).

**Leaving the window:** music pauses when the window loses focus or the tab is hidden, and carries on when the visitor comes back, but only if it was playing when they left (`away` and `back` in music.ts). Pressing play, pause or a track in the meantime cancels the resume.

Panel and now-playing styles are `.music-*` and `.now-playing` in [style.css](../src/style.css).

---

## Grid and roads: [src/game/grid.ts](../src/game/grid.ts), [src/game/pois.ts](../src/game/pois.ts), [src/game/Roads.tsx](../src/game/Roads.tsx)

```ts
export const TILE = 1 // grid.ts: size of one grid tile in world units; places, props and roads sit on tile centres
```

There's no map on purpose: the island is found by walking round it. `pois` in pois.ts is the one list of places: home, each project station, the About sign and the Contact mailbox. Add an entry, and place its object at the same whole-number x/z, to give it a road. A path one tile wide runs all the way round the house, and every road leaves it from the loop tile nearest its place. Roads are one tile wide and run in straight lines with at most one 90° corner. They go along the shorter axis first and stop on the tile next to the place. If that route would cross another place or the house, they take the other corner.

---

## Island, cliffs and trees: [src/game/Island.tsx](../src/game/Island.tsx), [src/game/Trees.tsx](../src/game/Trees.tsx)

```ts
export const ISLAND_RADIUS = 18 // Island.tsx: in tiles; every tile whose centre is closer than this to spawn is land, so the shore steps along tile edges
export const FOREST = { x: -17, z: -15, r: 12 } // the forest's land to the north-west: every tile closer than r to (x, z) is land too
const WATER_Y = -1.2            // water surface height, well below the grass; the cliffs fill the drop
const COURSES = 3               // rows of stone blocks in each cliff face
const UNDERWATER = 0.4          // the cliff carries on this far under the water so its foot never shows a gap
const RIM_TOP = 0.04            // the pale capstone rim stands this far above the grass
const RIM_DEPTH = 0.16          // rim thickness, top to bottom
const RIM_IN = 0.14             // how far the rim reaches in over the grass
const RIM_OUT = 0.08            // how far the rim overhangs the cliff face
const STONE = [...]             // cliff block colours; each block picks one from a fixed hash, so the pattern never changes
const RIM = ...                 // capstone colour
const WATER_SIZE = 400          // water plane size; big enough that the camera never sees its edge
const WATER_SEGMENTS = 160      // squares across the water, so it bends with the curved world (curve.ts); one big square tilts below the cliffs and shows the sky through
const FOAM = 0.4                // width of the white surf border at the foot of the cliffs; keep under half a tile
const FOAM_PULSE = 1.2          // how fast the surf fades in and out, rad/s
const SEED = 7                  // Trees.tsx: change for a different (but still fixed) tree layout
const MAX_TREES = 70            // upper limit on the main island's scattered trees
const CLEARANCE = 1             // tiles kept free around every road tile, place and the house
const SHORE_GAP = 1             // tiles kept free between trees and the cliff edge
const MIN_SCALE = 0.8           // trees are randomly sized between these
const MAX_SCALE = 1.3
const MAX_TRUNK = 0.3           // most a trunk's collider grows, so the pill fits between forest trees corner to corner
const FOREST_DENSITY = 0.85     // share of the forest's tree spots that get one
const FOREST_SCALE = [1, 1.5]   // forest trees are sized between these: taller than the island's
const CLEARING = 3.5            // radius of the open clearing in the middle of the forest, in tiles
const FADE = 0.75               // how much of a tree standing in front of the player drops out
```

The island is two overlapping circles of land: the main one round the house, and the forest's to the north-west (top left). `BOUND` in Island.tsx is how far out either reaches, for anything that loops over every tile.

On the main island, trees never touch each other, diagonals included, so there's always a gap to walk through. The forest is packed: a tree on every other tile, like a chessboard's dark squares (`FOREST_DENSITY` of them), so they only ever meet corner to corner and you can always slip through on the diagonals. In its middle is a clearing, and a road leads there from the house (a `forest` place in pois.ts); the pine cone waits in it.

Every tree between the camera and the player thins out (`seeThrough` in Trees.tsx): its shader drops out a fixed noise pattern of pixels, up to `FADE` of them, so the player never vanishes behind a canopy. They're placeholders: a trunk and a cone, drawn as two instanced meshes.

---

## House and doors: [src/game/House.tsx](../src/game/House.tsx), [src/game/layout.ts](../src/game/layout.ts), [src/game/Doors.tsx](../src/game/Doors.tsx), [src/game/scene.ts](../src/game/scene.ts)

```ts
export const INTERIOR = { x: 0, z: -200 }     // layout.ts: where the room is built, far off the island so nothing outside can reach it
export const ROOM = { hx: 5.5, hz: 3.5 }      // half-size of the room's floor (11 × 7 tiles); the walls, doors and indoor camera follow it
export const DOOR = 0.5                       // half-width of the doorway, inside and out
export const BED_SPAWN = { x: INTERIOR.x - 3, z: INTERIOR.z - 2, heading: 0 } // where every visit starts (moved to the nearest clear tile if furniture now stands there)
export const HOUSE = { i0: -2, i1: 2, j0: -2, j1: 0 } // tiles the house covers on the island (5 × 3); roads loop round it
export const OUTSIDE_SPAWN = { x: FRONT_DOOR.x, z: FRONT_DOOR.z + 1.1, heading: 0 } // coming out: in front of the door, facing the camera
export const INSIDE_SPAWN = { x: INTERIOR.x, z: INTERIOR.z + ROOM.hz - 1, heading: Math.PI } // going in: on the rug, facing into the room
const WALL = 0.5        // House.tsx: room wall thickness
const WALL_H = 1.6      // height of the room's back and side walls
const FRONT_H = 0.35    // height of the front wall; kept low so it never hides the room
const SEAM = 0.02       // dark gap between tatami mats (each mat is 1 × 2 tiles, half mats at row ends)
const HERI = 0.045      // width of the dark cloth border along each mat's long sides
const WEAVE = 9         // rush stripes per tile in the mats' weave texture
const MAT = [...]       // tatami colours, fresh to sun-faded; each mat picks one from a fixed hash
const OUT_WALL_H = 1.4  // outside: wall height
const RISE = 1          // outside: height of the roof's ridge above the walls
const EAVES = 0.25      // outside: how far the roof overhangs the walls
const WAY_OUT = ROOM.hz + 0.25     // Doors.tsx: step this far down the room through the doorway to leave
const PRESS = PILL_RADIUS + 0.1    // walk this close to the front door from outside to go in
export const FADE = 0.25           // scene.ts: seconds to fade to black, and again to fade back (instant with reduce motion)
```

Both areas stay loaded and only one is drawn, so trips are instant. Each arrival spot is clear of the doorway it came through, so arriving never sends you straight back; keep it that way if you move a spawn or a door. The fade's look is `.fade` in [style.css](../src/style.css); keep its transition time equal to `FADE`.

## Furniture and edit mode: [src/game/room.ts](../src/game/room.ts), [src/game/Furniture.tsx](../src/game/Furniture.tsx), [src/game/edit.ts](../src/game/edit.ts), [src/game/EditRoom.tsx](../src/game/EditRoom.tsx)

```ts
export const PIECES = [...]  // room.ts: every movable piece, its name and footprint in tiles (w across, d deep); floor: true for rugs
const DEFAULT = {...}        // where each piece starts: its top-left tile, house-local (tile i, j is centred on x = i, z = j)
const DOORWAY = [...]        // tiles just inside the door, always kept clear of furniture
const SAVE_KEY = 'room-layout-v1' // the visitor's layout is saved in their browser under this; bump it if you change the pieces
const LIFT = 0.25            // Furniture.tsx: how high a piece floats while being moved
const BOB = 0.04             // and how much it bobs (off with reduce motion)
const LINE = 0.04            // EditRoom.tsx: width of the grid lines shown while editing
const OK / NO / AIM / OVER   // highlight colours: fits, doesn't fit, empty tile, a piece you could pick up
```

Press F indoors, or the Edit room button, to rearrange the room. The player stands still while you edit. Drag a piece with the mouse or a finger, or move the cursor with the arrows or WASD and press E (or Enter or Space) to pick it up and put it down. Esc puts the piece in hand back where it came from, or ends edit mode; F or Done ends it too. Reset puts everything back where `DEFAULT` has it.

A piece only goes down where it fits. It must stay inside the room and not overlap other furniture (rugs only clash with rugs, so furniture can stand on them). It can't block the doorway, cover the tiles the player stands on, or shut the player off from the door. A saved layout that breaks any of these rules on load (say, after the pieces change) is dropped in favour of `DEFAULT`, and in development the console warns if `DEFAULT` itself breaks one.

**Adding a piece:** add it to `PIECES` and `DEFAULT` in room.ts, then give it a `Build` in Furniture.tsx: its blocks around the footprint's centre, and its colliders relative to that centre. Something to use on it goes in `USES` there. A piece that draws itself (like the record player) calls `usePiece()` instead. Edit bar styles are `.edit-*` in [style.css](../src/style.css).

---

## Bag and items to find: [src/game/inventory.ts](../src/game/inventory.ts), [src/game/Pickups.tsx](../src/game/Pickups.tsx), [src/game/InventoryPanel.tsx](../src/game/InventoryPanel.tsx)

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
const COLUMNS = 3  // InventoryPanel.tsx: slots per row; matches .bag-slots in style.css
```

B (or the Bag chip at the top right, which phones use since their B button sprints) opens the bag: a slot per item, a question mark until it's found, and the chosen item's name and words below. Arrow keys move between slots; B, Esc or × closes it.

An item's `at` is only where it would like to be. If that tile is a road, a place or its neighbours, the house, or near a tree, it moves to the nearest clear tile, so moving roads or reseeding trees never buries one. Picking one up plays `chime` (sfx.ts) and says what it is; the first find also says how to open the bag.

**Adding an item:** add its id to `ItemId` and an entry to `ITEMS`, then give it a shape in `SHAPES` (Pickups.tsx) and an icon in `ICONS` (InventoryPanel.tsx), a small picture on a 24 × 24 grid. Bag styles are `.bag-*` in [style.css](../src/style.css).

On touch screens the bag is condensed to fit between the top chips and the touch controls: six slots to a row instead of three (`COLUMNS` in InventoryPanel.tsx and the `(pointer: coarse)` rules in style.css use the same media query). While any panel is open, the joystick and buttons are hidden (`data-panel` on `<body>`, set in Game.tsx).

Below the items, the bag lists every kind of fish (see Fishing). Arrow keys run on from one grid into the other, so keep `ITEMS` a multiple of `COLUMNS`.

---

## Fishing: [src/game/fishing.ts](../src/game/fishing.ts), [src/game/Dock.tsx](../src/game/Dock.tsx)

```ts
export const DOCK = { x: -9, half: 0.7, z0: 15.5, z1: 19.5 } // fishing.ts: the dock's centre line, half-width, and where it leaves the shore and ends
export const DOCK_ROOT = { x: -9, z: 15 }  // the land tile it leaves from; a road leads here (a 'dock' place in pois.ts)
export const BARREL_AT = { x: -8, z: 15.1 } // the barrel of rods
export const SPOTS = [...]                 // where the ripple can be; it moves to another after each catch
export const CAST_TIME = 0.55              // seconds for the float to fly out
const WAIT = [2.5, 6]                      // seconds before a bite, at random between these
const BITE_TIME = 0.9                      // seconds to reel in once it bites
const LAND_PAUSE = 0.35                    // seconds between landing a fish and the words about it, so the moment lands first
export const FISH = [...]                  // every fish: name, words, colour, how often it bites (weight) and its size range in cm
const SAVE_KEY = 'fish-v1'                 // localStorage key for catches; change it to forget them
const RANGE = 1.6                          // Dock.tsx: how close to the ripple the player must be to cast
const RIPPLE_R = 0.6                       // how far each ring of the ripple spreads, and RIPPLE_PERIOD = 2.2 s for one ring
const POSTS = [17, 18.3, ...]              // z of each pair of posts under the dock; keep them off land tiles
const ROD_LENGTH = 1.3                     // the rod in the player's hand; HOLD and FISHING_HOLD are how far it tips forward
```

The road ends at the foot of the dock, beside the barrel. Using the barrel takes a rod (or puts it back), and so does B on the keyboard, which reels in first if the line is out. On phones the B button stays sprint; the **Put away rod** chip at the top right (`RodButton` in InventoryPanel.tsx, `.rod-toggle` in style.css) does it instead, on every device. It shows while a rod is in hand, except by the ripple, while the line is out, and while dialogue, a panel, a fade or edit mode is up. The rod isn't saved, so every visit starts without one. The ripple off the dock says to fetch a rod until you have one, then casts: the player turns to face it, the float flies out on its line, and after `WAIT` it nibbles, then bites with a splash and the prompt turns gold: **Reel in!** E, Space or A within `BITE_TIME` lands the fish; too late and it gets away, too early and the line comes back empty. Esc reels in quietly. The player stands still while the line is out.

What bites is drawn by `weight`, and its length leans small, so big ones are rarer. Each catch is counted with its best size and shown in the bag.

**Feedback, and when it doesn't fire.** A kind of fish never caught before gets the `fanfare` (sfx.ts) and a brief camera zoom; a new biggest gets the zoom with the short `catch` blip; any other catch only the blip, so the hundredth minnow doesn't hold you up. The zoom never runs with reduced motion. Items found on the island keep the `chime`.

The dock is a walkway: the water either side of it doesn't stop the player (`dockOpens` in fishing.ts, used by Player.tsx); thin colliders along its open sides and across its end do instead. Footsteps on it are `wood`. The sounds are `plop` (the float landing) and `splash` (a bite) in sfx.ts.

**Moving the dock:** change `DOCK` and `DOCK_ROOT` together, keep `POSTS` over water, and move `BARREL_AT` and `SPOTS` with it. Every spot must be within `RANGE` of somewhere on the deck but not of the shore.

---

## Touch controls: [src/game/Joystick.tsx](../src/game/Joystick.tsx)

```ts
const TRAVEL = 40 // pixels the knob can move from centre; dragging this far = full speed
const DEAD_ZONE = 0.15 // the first 15% of travel does nothing, so a resting thumb doesn't creep
```

Joystick and A/B button sizes and positions are in [style.css](../src/style.css) (`.joystick`, `.joystick-knob`, `.action-button` for A, `.action-button-b` for B). B sits 72px left of A (button width 64 + an 8px gap) and 24px lower. If you resize the buttons, update that `72px` too. If you resize the joystick, also update the `.action-button` `bottom` offset (it's set to line up with the joystick's middle) and the touch-device `.project-card-region` `bottom` offset (it keeps the card above the controls).

---

## Keyboard: [src/game/input.ts](../src/game/input.ts)

```ts
const codes: Record<string, Dir> = {
  KeyW: 'forward',
  ArrowUp: 'forward', // physical key positions (e.code), so it works on any keyboard layout
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint', // hold to sprint
}
// In bindKeys: Space = advance dialogue if open, else reel in a line that's out (fishing.ts), else roll; E / Enter = interact (interact.ts), or reel in; Esc = close dialogue and reel in; F = edit the room (indoors); G = point the way to an unseen place (guide.ts); L = open or close the dialogue log (log.ts); B = put away the rod if one is in hand (fishing.ts), else open or close the bag (inventory.ts)
// While editing, keys go to editKey() in edit.ts instead
```

---

## HUD hearts: [src/game/store.ts](../src/game/store.ts), [src/game/Hearts.tsx](../src/game/Hearts.tsx)

```ts
maxHearts: 3 // store.ts: number of heart containers shown
health: 6 // store.ts: starting health in HALF hearts (6 = 3 full hearts; 5 = 2½)
```

Hearts.tsx colours:

```tsx
<stop offset="0" stopColor="#ff6b5e" />    // red gradient: light top-left…
<stop offset="0.55" stopColor="#e2262b" /> // …main red…
<stop offset="1" stopColor="#a3121a" />    // …dark bottom-right
<stop offset="0" stopColor="#4a3436" />    // empty-socket gradient top
<stop offset="1" stopColor="#2b1c1e" />    // empty-socket gradient bottom
stroke="#2a1416" strokeWidth="2.2"         // outline colour and thickness
```

Heart size on screen is `.heart { width: 32px }` in [style.css](../src/style.css).

---

## World and rendering: [src/game/Game.tsx](../src/game/Game.tsx), [src/game/quality.ts](../src/game/quality.ts)

```tsx
dpr={tier === 'low' ? [1, 1.25] : [1, 1.5]}  // render resolution cap relative to the screen; the biggest performance lever on phones
gl={{ antialias: true }}                    // smooth edges on every device: multisampling is cheap even on phone GPUs, and the scene is light
```

The background, lights and fog come from the time of day; see the next section.

quality.ts decides the device tier:

```ts
return mobile || cores <= 4 || mem <= 4 ? 'low' : 'high' // touch devices, ≤4 CPU cores, or ≤4 GB RAM get the 'low' tier
```

---

## Time of day and weather: [src/game/sky.ts](../src/game/sky.ts), [src/game/Atmosphere.tsx](../src/game/Atmosphere.tsx), [src/game/Rain.tsx](../src/game/Rain.tsx), [src/game/Fireflies.tsx](../src/game/Fireflies.tsx)

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
const COUNT = 40                   // Fireflies.tsx: fireflies; SIZE = 0.3, WANDER = 0.5, HEIGHT = 0.45, BOB = 0.25
const GLOW = 1.1                   // House.tsx: window glow at full night
```

**Seeing a given hour:** add `?hour=21` to the URL. Decimals work, so `?hour=16.75` is 4:45pm. The snapshot skill shoots each slot this way.

**Seasons:** [src/game/season.ts](../src/game/season.ts) picks the season from the visitor's month (northern hemisphere: December to February is winter). Only winter changes the island so far:

- snow on the ground, a snow cap on each tree and a snowed-over roof (`GROUND` in Island.tsx, `capGeometry` in Trees.tsx, `O.roof` in House.tsx)
- snow falling all day instead of rain, heavier in the afternoon slot ([Snow.tsx](../src/game/Snow.tsx): `LIGHT`, `SPEED`, `SWAY`, `SIZE`)
- a cooler, paler light with snow bouncing light up from the ground (`chill` and the `WINTER_*` colours in sky.ts)
- crunchy footsteps (the `snow` sound in sfx.ts), puffs of snow instead of dust, and no fireflies

Add `?season=winter` to the URL to see it (or `spring`, `summer`, `autumn`). The snapshot skill pins every shot to summer, plus one winter shot.

With reduced motion, the colours and fog still change, but rain and fireflies hold still.

---

## Start-up: [src/main.tsx](../src/main.tsx)

```ts
requestIdleCallback(start, { timeout: 1500 }) // start loading the game when the browser is idle, or after 1.5 s at the latest
setTimeout(start, 200) // fallback for browsers without requestIdleCallback (Safari): start after 0.2 s
```

While the game loads, a black "Loading the island" screen (`.loader` in [style.css](../src/style.css)) covers the page, so the page doesn't flash up first. It fades out over 0.4 s once the game has drawn a frame: Game.tsx sends a `gameready` event from the canvas's `onCreated`. The view toggle stays above it.

## Link previews and search: [index.html](../index.html), [vite.config.ts](../vite.config.ts)

The Open Graph and Twitter tags in index.html use `%SITE_URL%`, which the build fills in. The build also writes `robots.txt` and `sitemap.xml`. The URL comes from the `SITE_URL` environment variable if it's set; on Vercel it's the production domain (`VERCEL_PROJECT_PRODUCTION_URL`); locally it's `http://localhost:4173`. The preview image is [public/og.jpg](../public/og.jpg), a 1200 × 630 screenshot of the island in the morning with the HUD hidden. Retake it when the island changes a lot. The favicon is [public/favicon.svg](../public/favicon.svg).
