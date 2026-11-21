# Core notes

Shared state and plumbing: the store, scenes, input (keys, controller, focus), collision, the camera, the curved world, sound, music and what the browser keeps. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Sound effects: [sfx.ts](./sfx.ts)

```ts
const LEVEL = 0.5 // effects at full on the settings' Sound effects slider (settings.ts), apart from the music's volume and mute
const STEP_VOLUME = 0.45 // footsteps relative to the other effects
const ROLL_VOLUME = 0.2 // the roll's whoosh relative to the other effects
const WET_VOLUME = 0.7 // the splash layered under each synthesised footstep in the rain, relative to the step (Player.tsx: from WET_RAIN = 0.5 rain, outdoors, not in winter)
const TONE = { grass: { lowpass: 1800, bass: 9 } } // a recording's filters: Hz it rolls off above, dB added below 300 Hz
const STEP_PITCH = 0.03 // a recorded step's pitch varies by up to this share either way (synthesised ones by 0.1)
```

Every sound is synthesised in `SOUNDS` (no audio files): footsteps for grass, snow, road and tatami, the furniture thud (`wood`), the roll whoosh, the door, dialogue blips and clicks. Change a sound's pitch or length there.

To use real recordings instead, put the files in `public/sfx/` and list them in `FILES` in sfx.ts. Grass and tatami footsteps already do, e.g. `grass: ['/sfx/grass_L.wav', '/sfx/grass_R.wav']`. With several files a sound takes turns through them in order, so a left and a right step alternate. The names are `grass`, `snow`, `road`, `tatami`, `wood`, `whoosh`, `door`, `blip` and `click`. Any sound left out stays synthesised, and a file that fails to load falls back to it too. A sound with files plays nothing until they've loaded, rather than its synthesised stand-in, and recorded steps play alone, with no rain splash over them. So on grass you hear only `grass_L` and `grass_R`, taking turns. The grass recordings are bright (most of their energy is at 2–4 kHz), which sounds tinny at walking pace, so `TONE` darkens them and adds some low end. Its filters are made once and shared.

---

## Curved world: [curve.ts](./curve.ts)

```ts
export const CURVE = 0.02 // how fast the ground falls away behind the player; 0 turns the curve off
export const FLAT = 6 // units behind the player before the bend starts, so the ground you walk on (and the room indoors) stays flat
```

Everything past `FLAT` drops by `CURVE × distance²`, so the island rolls away over a horizon like a small planet. It's a patch to three's shared vertex step, so every material bends alike. Only how things look bends: positions, collisions and interactions are unchanged. A stronger curve or a lower camera shows more sky.

---

## Camera: [CameraRig.tsx](./CameraRig.tsx)

```ts
export const HEIGHT = 8 // how high the camera sits above the floor (with DISTANCE = 10.25: about 38° down, 13 units from the player)
export const DISTANCE = 10.25 // how far back (toward the viewer) it sits from the player; a little lower than 45°, so the curved horizon shows
const LAMBDA = 4 // follow rate: higher = camera sticks closer to the player, lower = floatier lag
const ZOOM = 0.18 // a catch's zoom: how much nearer the camera comes, as a share of its distance (cameraZoom in state.ts)
const ZOOM_TIME = 0.9 // seconds in and back out
const ROOM_MARGIN = 1 // indoors: black kept beside the room's side walls when the screen is wide enough
const ROOM_SHIFT = -0.5 // indoors: aim this far behind the room's centre so the tall back wall stays in view
```

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
PILL_RADIUS * 0.5 // Player.tsx: longest move per substep, so fast rolls can't pass through thin obstacles
```

The player is a circle of `PILL_RADIUS`. Obstacles are circles or axis-aligned boxes added with `addCollider(…)` in an effect (it returns its own cleanup). Each frame the player is pushed out of anything it overlaps, and the part of its velocity heading into the obstacle is dropped, so it slides along walls. Keep each interactable's `range` larger than its collider plus `PILL_RADIUS` (about 0.85 for a station), or the player won't be able to get close enough to use it.

---

## Keyboard: [input.ts](./input.ts), [keymap.ts](./keymap.ts)

```ts
// keymap.ts: [main key, spares…] per action, as physical key positions (e.code), so it works on any keyboard layout
const DEFAULTS: Record<Action, string[]> = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'], // hold to sprint
  roll: ['Space'], interact: ['KeyE', 'Enter'], attack: ['KeyJ', 'KeyX'], bag: ['KeyB'],
  log: ['KeyL'], settings: ['KeyO'], edit: ['KeyF'], photo: ['KeyP'],
}
// Every main key can be changed under Keys in the settings (saved as keys-v1). The spares keep working
// unless the visitor gives one to something else. Escape and Tab can't be taken. Hints name the main
// key (keyName), so they follow a change. Edit mode's own keys (edit.ts) don't change.
// J or X = the sword: down swings, held after a swing charges, up lets a charged spin go (combat.ts)
// The mouse, over the game (not the HUD): left button = the sword, like J; right button = put the rod away, like B (the browser's menu is kept off the game)
// In bindKeys: Space = advance dialogue if open, else reel in a line that's out (fishing.ts), else roll; E / Enter = interact (interact.ts), or reel in; Esc = close dialogue and reel in; F = edit the room (indoors); L = open or close the dialogue log (log.ts); O = the settings; P = photo mode (photo.ts); B = put away the rod if one is in hand (fishing.ts), else open or close the bag (inventory.ts)
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

Polled once a frame (`<Controls>` in Game.tsx). Left stick or d-pad walks; a trigger or a stick click sprints. A uses, B rolls (or reels in), X is the sword (hold to charge), Y is the bag (or puts the rod away), LB points the way, RB is photo mode, View is the log and Menu the settings. In a panel the stick moves between controls (arrow keys for the bag's grid, left and right for a slider), A presses and B closes. In photo mode A takes the photo, B or RB leaves, X changes the pose, LB or LT zooms out and RT in.

---

## What's kept: [save.ts](./save.ts)

Every part of a visit is kept in this browser's localStorage, each module under its own key, read once and written on change. All of it goes through [persist.ts](./persist.ts): `readSaved(key)` gives the parsed value or undefined, and each module checks its shape; `writeSaved(key, value)` saves it, or forgets the key for undefined. Blocked or full storage just means nothing is kept. **Start over** in the settings (it asks twice) clears every key but `PREFERENCE_KEYS` in save.ts (the settings, the music volume and the keys) and reloads, so it can't miss a key, even one from a module that hasn't loaded yet.

---

## Shared helpers: [keymap.ts](./keymap.ts), [sceneFrame.ts](./sceneFrame.ts)

**Hints** name the controls the visitor has: `hint('Press {bag} to open it', 'Tap Bag in the menu')` gives the touch words on a touch screen, otherwise the keyboard words with `{action}` replaced by its main key and `{action*}` by all of its keys, so every hint follows a remap. Write new hints this way rather than with `isTouch ?`.

**Frame work by area:** `useSceneFrame('world', cb)` is `useFrame` that skips its callback while another area is on show. Use it for purely visual work in one area (spinning, bobbing, glows). Anything that must keep going in the background, like the cave's block sliding home or the fishing logic, uses `useFrame`.
