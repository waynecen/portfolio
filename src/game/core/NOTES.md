# Core notes

Shared state and plumbing: the store, scenes, input (keys, controller, focus), collision, the camera, the curved world, sound, music and what the browser keeps. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Sound effects: [sfx.ts](./sfx.ts)

```ts
const LEVEL = 0.5 // effects at full on the settings' Sound effects slider (settings.ts), apart from the music's volume and mute
const STEP_VOLUME = 0.45 // footsteps relative to the other effects
const WHOOSH_VOLUME = 0.2 // the whoosh (a sword swing, a cast) relative to the other effects
const WET_VOLUME = 0.7 // the splash layered under each synthesised footstep in the rain, relative to the step (Player.tsx: from WET_RAIN = 0.5 rain, outdoors, not in winter)
const TONE = { grass: { lowpass: 1800, bass: 9 } } // a recording's filters: Hz it rolls off above, dB added below 300 Hz
const STEP_PITCH = 0.03 // a recorded step's pitch varies by up to this share either way (synthesised ones by 0.1)
```

Every sound is synthesised in `SOUNDS` (no audio files): footsteps for grass, snow, road, stone (the cave and the city square) and tatami, the dock's boards (`wood`), the furniture thud (`thud`), the whoosh (sword, casting), the door, dialogue blips and clicks. Change a sound's pitch or length there.

To use real recordings instead, put the files in `public/sfx/` and list them in `FILES` in sfx.ts. Grass, tatami, road and wood footsteps already do (the roads with sand_L and sand_R, the dock with wood_L and wood_R, turned down by `STEP_LEVEL` to sit with the grass; the cave floor and the city square are `stone`, still synthesised), and so does the house's front door (`homeDoor`: open-door.wav, going in or out; the cave and boat trips keep the synthesised `door`), e.g. `grass: ['/sfx/grass_L.wav', '/sfx/grass_R.wav']`. With several files a sound takes turns through them in order, so a left and a right step alternate. The names are `grass`, `snow`, `road`, `stone`, `tatami`, `wood`, `thud`, `whoosh`, `door`, `homeDoor`, `blip` and `click`. Any sound left out stays synthesised, and a file that fails to load falls back to it too. A sound with files plays nothing until they've loaded, rather than its synthesised stand-in, and recorded steps play alone, with no rain splash over them. So on grass you hear only `grass_L` and `grass_R`, taking turns. The grass recordings are bright (most of their energy is at 2–4 kHz), which sounds tinny at walking pace, so `TONE` darkens them and adds some low end. Its filters are made once and shared.

---

## Curved world: [curve.ts](./curve.ts)

```ts
export const CURVE = 0.02 // how fast the ground falls away behind the player; 0 turns the curve off
export const FLAT = 6 // units behind the player before the bend starts, so the ground you walk on (and the room indoors) stays flat
```

The shadow pass is left unbent (`#ifndef DEPTH_PACKING`): there `cameraPosition` is the sun's, not the camera's. Shadows are looked up from unbent positions too, so they still land under their casters.

Everything past `FLAT` drops by `CURVE × distance²`, so the island rolls away over a horizon like a small planet. It's a patch to three's shared vertex step, so every material bends alike. Only how things look bends: positions, collisions and interactions are unchanged. A stronger curve or a lower camera shows more sky.

---

## Shading: [shading.ts](./shading.ts)

```ts
const WRAP = 0.35            // how far light wraps past the side turned away from it; 0 = plain Lambert
const SHADE = [0.62, 0.7, 1] // the colour shadows lean toward (cool)
const SHADE_AMOUNT = 0.2     // how much of the sun's strength comes back into shade, in that colour
const RIM = [1, 0.86, 0.66]  // the warm rim on silhouette edges
const RIM_AMOUNT = 0.3       // its strength, as a share of the sun
const RIM_POWER = 3          // how tight to the edge it stays
```

Every Lambert material (nearly everything) gets the game's soft, stylised shading from a patch to three's shared shader chunks, like the curve: wrapped diffuse, cool-tinted shade where the sun doesn't reach, and a warm rim. Only the sun tints shade and lights rims; lanterns and the player's glow just wrap. The patch keeps the sun's colour and shadow in two globals in the directional light loop, behind `SOFT_SHADING`, which only the Lambert material defines, so other material types compile as before. If a three update changes that loop, the module throws at load and says so.

---

## Wind: [wind.ts](./wind.ts)

```ts
const SPEED = 1.3                 // the sway's base rate, rad/s
const RAIN = 1.8                  // how much harder it blows in the rain
const RIPPLE = [0.37, 0.23]       // how the phase changes across the island, per unit: the gusts' spacing
// Per material, sway(material, { height, amount, rate?, part? }):
// trees (Trees.tsx): { height: 1.65, amount: 0.07 }, shared by trunk, canopy and snow cap so they move together
// grass (Grass.tsx): { height: 0.42, amount: 0.05, rate: 1.6, part: { radius: 0.9, amount: 0.2 } }, parting round the player
```

Trees and grass sway in the vertex shader, from one clock that Atmosphere.tsx ticks (`tickWind`), so nothing moves on the CPU. Each vertex bends by the square of its height, in one world direction for the whole island, with a phase from where it stands so gusts ripple across. With reduced motion the strength is 0. Three's shared shadow (depth) material doesn't sway, so a swaying mesh takes `swayShadow(s)` as its `customDepthMaterial` (the pines and the grass do), and its shadow moves with it. `sway()` keeps a material's own onBeforeCompile (the pine's seasons) and gives it its own program cache key.

---

## Height fog: [haze.ts](./haze.ts)

```ts
const LOW = -1.3   // at and below this (curved) height the mist is full; the water is at -1.2
const HIGH = -0.1  // above this, none: the ground you walk on stays clear
const CLOSE = 10   // a slot whose fog starts this near (sky.ts fogNear) gets full strength...
const OPEN = 30    // ...and one starting this far or further, none
const MOST = 0.85  // never quite opaque
```

A patch to three's shared fog chunks, on top of the fog by distance. It reads the curved height (curve.ts marks it with `HAS_CURVED_WORLD`), so the far island, bending away, sinks into haze too. Its strength follows how near the slot's fog starts, since a shared chunk can't add a uniform: the misty dawn gets nearly all of it, rain and night a little, the clear morning, the evening and indoors none. A material with `defines = { NO_HAZE: '' }` stays out of it (the boats, which sit at the water line and washed out).

---

## Camera: [camera.ts](./camera.ts), [CameraRig.tsx](./CameraRig.tsx)

```ts
export const HEIGHT = 8.7 // camera.ts (with DISTANCE, shakeCamera, nudgeCamera): how high the camera sits above the floor (with DISTANCE = 9.65: about 42° down, 13 units from the player)
export const DISTANCE = 9.65 // how far back (toward the viewer) it sits from the player; a little lower than 45°, so the curved horizon shows
const LAMBDA = 4 // follow rate: higher = camera sticks closer to the player, lower = floatier lag
const ZOOM = 0.18 // a catch's zoom: how much nearer the camera comes, as a share of its distance (cameraZoom in state.ts)
const ZOOM_TIME = 0.9 // seconds in and back out
const ROOM_MARGIN = 1 // indoors: black kept beside the room's side walls when the screen is wide enough
const ROOM_SHIFT = -0.5 // indoors: aim this far behind the room's centre so the tall back wall stays in view
const ROOM_PITCH = 36° // in the house: a lower angle than outdoors (about 42°), so the furniture reads as 3D rather than from above; editing still rises to EDIT_PITCH
const LEAD = 0.9 // outdoors, how far ahead of the player the camera looks at walking pace (more sprinting)
const LEAD_EASE = 1.6 // how slowly the lead follows a turn: a slight lag, never a swing
const SHAKE_TIME = 0.45, SHAKE_RATE = 38 // a shake's length and tremble (shakeCamera(amount), default 0.12)
const NUDGE = 0.35, NUDGE_TIME = 1.4 // a nudge leans this share of the way toward its point, and back (nudgeCamera(x, z))
const EDIT_PITCH = 70° // editing the room: the camera looks down this steeply...
const EDIT_FAR = 1.35 // ...from this much further away than usual, so the whole floor reads as a grid
const EDIT_SHIFT = -0.6 // ...aimed this much further back, so the edit bar at the top clears the back row
const EDIT_EASE = 5 // how quickly it moves there and back (straight there with reduced motion)
```

Big moments only: the last pearl shakes the camera; a hole in one nudges it toward the cup with a small shake. Neither happens with reduced motion, and the lead is off then too (and in photo mode and indoors).

To zoom, change `HEIGHT` and `DISTANCE` together. To make the view more top-down, raise `HEIGHT` relative to `DISTANCE`.

Indoors the camera holds still on the room. On a screen too narrow to show the whole room, it follows the player sideways, but never far enough to show past the walls.

Field of view is set in [Game.tsx](../Game.tsx): `fov: 35` (degrees). Lower is more zoomed-in and flatter, higher is wider and more distorted.

---

## Interactions and dialogue: [interact.ts](./interact.ts), [Dialogue.tsx](../ui/Dialogue.tsx)

```ts
range: 1.4 // Furniture.tsx: how close the player must be to read the note (every interactable sets its own range)
const CHARS_PER_SECOND = 40 // Dialogue.tsx: typewriter speed; lines appear instantly with "reduce motion" on
const PAUSE_SENTENCE = 0.25 // Dialogue.tsx: extra pause (s) after . ! ? so the text reads like speech
const PAUSE_COMMA = 0.1 // Dialogue.tsx: extra pause (s) after , ; :
const MAX = 40 // log.ts: conversations kept in the dialogue log; older ones drop off
const LEAVE = 0.6 // Interactions.tsx: a dialogue closes once the player is this much beyond the range of what started it
const SAY_RANGE = 1.5 // interact.ts: the range used when nothing was in focus (it belongs to the spot it opened at)
```

Bubble look is in [ui/hud.css](../ui/hud.css): `.dialogue-cloud` `fill` (cream), `.dialogue` `color` (brown text), `.dialogue-next` `fill` (arrow), and the `dialogue-pop` keyframes (pop-in). The cloud outline is the SVG `path` in Dialogue.tsx; it stretches to fit, so it works at any width.

Anything the player can use calls `register({ x, z, range, prompt, onInteract })` in an effect. Each frame, the nearest one in range gets focus and shows its prompt ("E Read"), or its card if it has a `card` (a project, or the contact links; the card's `action` labels what using it opens). The player can keep walking while a dialogue is open: walking out of range of whatever started it closes it, so reading a sign never holds you in place. Panels, edit mode, the fade between areas and a fishing line out still hold the player still (`held()` in interact.ts). To add a sign, place `<Sign x z lines={[…]} />` in [Game.tsx](../Game.tsx). The welcome and controls text is the `NOTE` array in [Furniture.tsx](../house/Furniture.tsx), with a keyboard and a touch version.

**The log** ([log.ts](./log.ts), [LogPanel.tsx](../ui/LogPanel.tsx)): every conversation this visit is kept, newest at the bottom; L (or Log in the bag) opens it, and L, Esc or × closes it. **Told once:** `sayFirst(key, first, again)` in interact.ts says the full `first` lines the first time this browser hears about `key`, and the short `again` lines after (saved under `told-v1`). The rod barrel and the ripple use it.

---

## Collision: [collision.ts](./collision.ts)

```ts
const BASE_RADIUS = 0.5 // Station.tsx: pedestal width, also its collision circle
addCollider({ kind: 'box', x, z, hx: 0.45, hz: 0.1 }) // Sign.tsx: half-width and half-depth of the sign's solid box
const TRUNK_RADIUS = 0.25 // Trees.tsx: tree collision circle at scale 1 (scaled with the tree)
PILL_RADIUS * 0.5 // Player.tsx: longest move per substep, so a fast knockback can't pass through thin obstacles
```

The player is a circle of `PILL_RADIUS`. Obstacles are circles or axis-aligned boxes added with `addCollider(…)` in an effect (it returns its own cleanup). Each frame the player is pushed out of anything it overlaps, and the part of its velocity heading into the obstacle is dropped, so it slides along walls. Keep each interactable's `range` larger than its collider plus `PILL_RADIUS` (about 0.85 for a station), or the player won't be able to get close enough to use it.

---

## Keyboard: [input.ts](./input.ts), [keymap.ts](./keymap.ts)

```ts
// keymap.ts: [main key, spares…] per action, as physical key positions (e.code), so it works on any keyboard layout
const DEFAULTS: Record<Action, string[]> = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'], // hold to sprint
  interact: ['KeyF', 'Enter'], attack: ['Space', 'KeyJ', 'KeyX'], bag: ['KeyB'],
  log: ['KeyL'], settings: ['KeyO'], edit: ['KeyG'], photo: ['KeyP'],
}
// Every main key can be changed under Keys in the settings (saved as keys-v1). The spares keep working
// unless the visitor gives one to something else. Escape and Tab can't be taken. Hints name the main
// key (keyName), so they follow a change. Edit mode's own keys (edit.ts) don't change.
// Space, J or X = the sword: down swings, held after a swing charges, up lets a charged spin go (combat.ts); with dialogue open it advances it instead, and with a line out it reels in
// The mouse, over the game (not the HUD): left button = the sword, like J; right button = put the rod away, like B (the browser's menu is kept off the game)
// In bindKeys: F / Enter = interact (interact.ts), or reel in; Esc = close whatever is open (dialogue, a panel, the line, the golf putt), or with nothing open (busy() is false), open the settings; G = edit the room (indoors); L = open or close the dialogue log (log.ts); O = the settings; P = photo mode (photo.ts); B = put away the rod if one is in hand (fishing.ts), else open or close the bag (inventory.ts)
// While editing, keys go to editKey() in edit.ts instead; in photo mode, photoKey() in photo.ts goes first
```

Panels keep Tab inside them, and give focus back to the button that opened them when that was reached from the keyboard (focus.ts). With reduced motion the camera locks onto its target (`STEADY = 30` in CameraRig.tsx) instead of drifting after it.

---

## Controller: [gamepad.ts](./gamepad.ts)

```ts
const DEAD = 0.22    // stick dead zone; past it, the walk is rescaled so a light push walks slowly
const NAV = 0.6      // in a panel, how far the stick must lean to move between controls
const TRIGGER = 0.3  // how far a trigger must go to count as held
```

Polled once a frame (`<Controls>` in Game.tsx). Left stick or d-pad walks; a trigger or a stick click sprints. A uses, B continues dialogue (or reels in), X is the sword (hold to charge), Y is the bag (or puts the rod away), LB points the way, RB is photo mode, View is the log and Menu the settings. In a panel the stick moves between controls (arrow keys for the bag's grid, left and right for a slider), A presses and B closes. In photo mode A takes the photo, B or RB leaves, X changes the pose, LB or LT zooms out and RT in.

---

## What's kept: [save.ts](./save.ts)

Every part of a visit is kept in this browser's localStorage, each module under its own key, read once and written on change. All of it goes through [persist.ts](./persist.ts): `readSaved(key)` gives the parsed value or undefined, and each module checks its shape; `writeSaved(key, value)` saves it, or forgets the key for undefined. Blocked or full storage just means nothing is kept. **Start over** in the settings (it asks twice) clears every key but `PREFERENCE_KEYS` in save.ts (the settings, the music volume and the keys) and reloads, so it can't miss a key, even one from a module that hasn't loaded yet.

---

## Resolution: [adaptive.ts](./adaptive.ts)

```ts
const STEPS = [0.5, 0.6, 0.75, 1, 1.25, 1.5] // device pixel ratios to choose between, never above the screen's own
const MAX_PIXELS = 2560 * 1440 // no step draws more than this
const MIN_PIXELS = 1600 * 900  // steps under 1 (big windows only) never draw fewer than this
const SAMPLES = { full: 4, eased: 0 } // multisampling on the top rung only; below it none, and SMAA smooths the edges instead (world/PostFX.tsx)
const WINDOW = 2             // seconds of frames looked at per check
const SLOW = 1 / 50          // slower than this on average: drop a rung
const LATE = 0.08            // or more than this share of frames late (LATE_AT = 1.5 refreshes: held over for a second one): drop a rung
const ON_TIME = 0.01         // at most this share late, and the average at the screen's refresh, to climb one back
const HOLD = 12              // seconds after a drop before it may climb again; a climb that drops again within FAILED = 6 doubles it
const SKIP = 0.25            // longer frames (a tab coming back) aren't counted
```

Every device gets the same look; the resolution adapts instead of effects being cut. It moves along a ladder of rungs, each a pixel ratio and a multisampling level, cheapest first. The top rung multisamples (4×); the first step down keeps the resolution and swaps multisampling for SMAA, which looks nearly the same (compared side by side at 1440p) and saved 1.3 of 4.9 ms of GPU time a frame there on an RTX 3060 Ti, enough for a 165 Hz screen's 6 ms. 2× cost as much as 4×: the price is the separate multisampled buffer, not the sample count. Only then does the ratio come down. So even a 1080p window at ratio 1, which has no lower ratio, has a rung to drop to. What costs is the pixel count, not the ratio, so a big window starts lower and can drop under 1: a 1440p window at ratio 1 can go to 0.75, a 4K one starts at 0.6. The rungs are worked out again on a resize.

It watches for stutter as well as slowness: a frame is late when it took one and a half refreshes (the refresh is the frame time a fifth of the frames beat), so 55 fps on a 60 Hz screen, or 120 on a 165 Hz one, which average fine but skip a refresh every few frames, drop a rung. It climbs back when every frame is on time at the screen's own refresh (before, the climb needed over 80 fps, so on a 60 Hz screen one slow patch, like models loading, kept a lower resolution for the whole visit). A climb that fails waits twice as long before the next try, so it settles. PostFX resizes its buffers whenever the ratio changes (otherwise they stay at the starting resolution and a drop saves nothing), and reads `quality.samples` each frame.

---

## Shared helpers: [keymap.ts](./keymap.ts), [sceneFrame.ts](./sceneFrame.ts), [gltf.ts](./gltf.ts)

**Baked ambient occlusion:** `tint()` in [geometry.ts](./geometry.ts) darkens a piece toward the ground as it colours it: `AO = 0.32` darker right at y = 0, fading out by `AO_REACH = 0.4`. Pieces flatter than `AO_MIN_HEIGHT = 0.05` are the ground itself and stay even. A box only has vertices at its top and bottom, so a tall wall gets one long, soft gradient rather than a band at the floor. It's baked into the vertex colours once, so it costs nothing per frame.

**Models:** `useGLB(url)` loads a model from public/models with the meshopt decoder (suspending, so wrap it in `<Suspense>`), and `lambertAll(root)` or `toLambert(material)` swaps its PBR materials for Lambert ones, to match the island's lighting. `lambertAll` returns the materials with their texture as an emissive map at 0; raise `emissiveIntensity` for a soft fill that keeps a prop's true colours from every side (the record player uses it). Import gltf.ts only from a lazily loaded component, so the loader stays out of the game chunk until a model is shown.

**Models behind the loader:** a model's stand-in (the blocks, the pill, the box cabinet) is wrapped in `<Held>` ([Held.tsx](./Held.tsx)) as its Suspense fallback. The loader stays up while any stand-in shows, so the first view has the real models, not blocks swapped out in front of the player (`whenModelsIn()` in [modelsIn.ts](./modelsIn.ts), awaited in Game.tsx's `onCreated` before `gameready`). `MAX_WAIT = 12` seconds caps the wait; after that the stand-ins show and swap in as before. `SETTLE = 2` frames with nothing held count as done. Wrap any new model's fallback in `<Held>` if it's in the starting room.

**Hints** name the controls the visitor has: `hint('Press {bag} to open it', 'Tap Bag in the menu')` gives the touch words on a touch screen, otherwise the keyboard words with `{action}` replaced by its main key and `{action*}` by all of its keys, so every hint follows a remap. Write new hints this way rather than with `isTouch ?`.

**Frame work by area:** `useSceneFrame('world', cb)` is `useFrame` that skips its callback while another area is on show. Use it for purely visual work in one area (spinning, bobbing, glows). Anything that must keep going in the background, like the cave's block sliding home or the fishing logic, uses `useFrame`.
