# House notes

The house: its rooms and doors, the furniture and edit mode, and the record player. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Record player and music: [RecordPlayer.tsx](./RecordPlayer.tsx), [music.ts](../core/music.ts)

```ts
const MODEL = '/models/recordPlayer.glb' // the Tripo model (models-src/recordPlayer.glb, through npm run models); the box cabinet stands in while it downloads
const FILL = { day: 0.2, night: 0.12 } // RecordPlayerModel.tsx: a whisper of studio fill (its texture as emissive), so its front isn't lost in shadow; less at night
const MODEL_W = 0.9 // the model is fitted to this width (it's then 0.8 deep, 0.78 tall); the collider is sized to it
const BACK = -0.08 // how far towards the back of its tile it stands (where it is comes from room.ts, like the other furniture)
const RANGE = 1.8 // how close the player must be to use it
const SPIN = 3.5 // the stand-in's platter speed while playing, rad/s (about 33 rpm); it spins up and winds down. The model's record is part of its mesh, so it doesn't spin
const PULSE = 0.08 // how much the cabinet bounces to the music's low end (off with reduce motion)
const DEFAULT_VOLUME = 0.6 // music.ts: starting volume before the visitor changes it (then remembered); 0.6 = two waves
const WAVE_LEVELS = [0.33, 0.66] // MusicPanel.tsx: volume up to 0.33 shows 1 wave, up to 0.66 shows 2, above that 3; the icon toggles mute (0) and back
analyser.fftSize = 64 // music.ts: analyser resolution for the pulse; level() averages the lowest 8 bins
```

**Adding music:** put files in `public/audio/` and list them in [tracks.ts](../core/tracks.ts) (`title`, `artist`, `src`, optional `credit`). Use AAC (.m4a) or Opus at about 96 to 128 kbps. While that list is empty, [placeholderTracks.ts](../core/placeholderTracks.ts) generates three 16-second chord loops in the browser. Edit `SONGS` there to change them (MIDI note numbers, 60 = middle C).

**Leaving the window:** music pauses when the window loses focus or the tab is hidden, and carries on when the visitor comes back, but only if it was playing when they left (`away` and `back` in music.ts). Pressing play, pause or a track in the meantime cancels the resume.

Panel styles are `.music-*` in [house.css](./house.css); the now-playing label is `.now-playing` in [ui/hud.css](../ui/hud.css).

---

## House and doors: [House.tsx](./House.tsx), [layout.ts](../world/layout.ts), [Doors.tsx](../core/Doors.tsx), [scene.ts](../core/scene.ts)

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

Both areas stay loaded and only one is drawn, so trips are instant. Each arrival spot is clear of the doorway it came through, so arriving never sends you straight back; keep it that way if you move a spawn or a door. The fade's look is `.fade` in [style.css](../../style.css); keep its transition time equal to `FADE`.

---

## Furniture and edit mode: [room.ts](./room.ts), [Furniture.tsx](./Furniture.tsx), [edit.ts](./edit.ts), [EditRoom.tsx](./EditRoom.tsx)

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

**Adding a piece:** add it to `PIECES` and `DEFAULT` in room.ts, then give it a `Build` in Furniture.tsx: its blocks around the footprint's centre, and its colliders relative to that centre. Something to use on it goes in `USES` there. A piece that draws itself (like the record player) calls `usePiece()` instead. Edit bar styles are `.edit-*` in [style.css](../../style.css).
