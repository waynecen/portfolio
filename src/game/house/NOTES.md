# House notes

The house: its rooms and doors, the furniture and edit mode, and the record player. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Record player and music: [RecordPlayer.tsx](./RecordPlayer.tsx), [music.ts](../core/music.ts)

```ts
const MODEL = '/models/recordPlayer.glb' // the Tripo model (models-src/recordPlayer.glb, through npm run models); the box cabinet stands in while it downloads
const FILL = { day: 0.2, night: 0.12 } // PropModel.tsx (every room model): a whisper of studio fill (its texture as emissive), so its front isn't lost in shadow; less at night
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

## Room lights: [RoomLights.tsx](./RoomLights.tsx), [lights.ts](./lights.ts), [Atmosphere.tsx](../world/Atmosphere.tsx)

```ts
const PENDANT = { x: 0, y: 2.25, z: 2.4 } // the paper lantern hanging from the ceiling, house-local, over the front of the rug (further back, it hides the fire from the room's low camera); its cord runs up out of sight
const CEILING = { day: 4.5, night: 12, distance: 13 } // its warm light (candela), blended by how much it's night: a pool under it, fading to the walls; it casts shadows
const LAMP = { day: 1, night: 2.5, distance: 3.5, y: 1.1 } // the paper lamp's light, once it's bought; it follows the lamp, into the hand while moving it
const FIRE = { day: 3, night: 6, distance: 6, y: 0.5, z: 0.55, color: '#ff9a4a' } // the fireplace's light, just out of its opening; it follows the fireplace like the lamp's, and casts shadows on a high-tier device (FIRE_SHADOW)
const SHADOW = { map: 512, bias: -0.002, normalBias: 0.02, radius: 4 } // the lantern's and the fire's shadows: cube maps, redrawn only in the house
const FLICKER = 0.15 // how much the fire's light flickers either way (a third of it with reduced motion); the flames (Fire in Furniture.tsx) flicker with it
const GLOW = { day: 0.35, night: 1.3 } // how much both paper shades glow (shadeMaterial's emissive)
const DRIFT = 0.025 // how far the ceiling lantern swings on its cord, radians, from the cord's top (still with reduced motion)
const COUNT = 60, SIZE = 0.075, SPEED = 0.06 // Motes.tsx: dust drifting in the room's air (0.3 to 2.2 up), wrapping round at the walls
const OPACITY = { day: 0.35, night: 0.7 } // the motes catch the lantern more at night
const SNAP = 18 // how fast the lantern comes on or goes out at the switch (damp rate)
const AT = { x: DOOR + 0.5, y: 0.19, z: ROOM.hz } // LightSwitch.tsx: the switch, on the front wall's inner face just right of the door (not on the outside of the house; out of the camera's sight)
const USE = { dz: -0.25, range: 0.8 } // used from inside at the wall; short, so it isn't in focus as you come in
const ROOM_DAY / ROOM_NIGHT // Atmosphere.tsx: indoors, a dim warm fill bounced off a pale floor (hemi 0.75, 0.5 at night) and no key from the daylight (its shadow map isn't redrawn indoors): the lantern and the fire do most of the lighting and cast the shadows, so the player's shadow falls away from them (the room's grade, PostFX.tsx, takes a little contrast off too)
```

**The light switch** turns the ceiling lantern off and on (**Lights off** / **Lights on**, a click); the paper lamp keeps its light. It isn't saved, so every visit starts lit (`useLightSwitch` in lights.ts). It's on the front wall, not the door post, because the prompt and the Bag sit over the doorway on screen. The lantern has its own copy of `shadeMaterial`, so it goes dark without the lamp.

The room's lights are mounted beside Atmosphere in Game.tsx, not in the house's group: that group is hidden outdoors, a hidden light drops out of the light count, and a change in the count recompiles every material on each trip through the door. So they're always mounted and sit at 0 away from the house. Keep any new room light the same way. A piece with a lit part gives its Build a `glow` geometry (Furniture.tsx), drawn in `shadeMaterial`.

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
const SEAM = 0.015      // dark gap between tatami mats (each 1 × 2 tiles, laid in pinwheel rings round a half mat in the middle: layMats)
const HERI = 0.05       // width of the dark navy cloth border along each mat's long sides, for mats lying across the room
const HERI_UP = 0.025   // and for mats running up the room, whose borders the camera's tilt makes look thicker
const WEAVE = 9         // rush stripes per tile in the weave texture; they run across each mat
const MAT = [...]       // tatami colours, fresh to sun-faded; each mat picks one from a fixed hash
const OUT_WALL_H = 1.4  // outside: wall height
const RISE = 1          // outside: height of the roof's ridge above the walls
const EAVES = 0.25      // outside: how far the roof overhangs the walls
const MODEL = { url: '/models/house.glb', width: X1 - X0 + 2 * EAVES, depth: Z1 - Z0 + 2 * EAVES, height: 2.9, ... } // the Tripo house over the footprint and eaves, lower than its own shape (4 tall) so it fits the view from the door; the blocks stand in while it downloads, the collider stays the walls' box
const BRIGHT = 0.45     // windows.ts: how warm its windows glow at full night (its blue panes, found by colour in its texture)
const ROOF_FROM = 1.25, UP = [0.3, 0.55] // snow.ts: in winter, whatever faces up (UP, world normal y) above this height turns snow white ('#f2f5f9', as the block roof), its fill FILL 0.2
const WAY_OUT = ROOM.hz + 0.25     // Doors.tsx: step this far down the room through the doorway to leave
const PRESS = PILL_RADIUS + 0.1    // walk this close to the front door from outside to go in
export const FADE = 0.25           // scene.ts: seconds to fade to black, and again to fade back (instant with reduce motion)
```

**The house model** isn't behind the loader (the game starts indoors). In winter its roof is snowed over by shape (snow.ts), since the model is one mesh: a new house model needs its eaves near `ROOF_FROM`. Its window glow picks texels bluer than they are red, so a new house model needs blue (or teal) panes and nothing else cool-coloured.

Both areas stay loaded and only one is drawn, so trips are instant. Each arrival spot is clear of the doorway it came through, so arriving never sends you straight back; keep it that way if you move a spawn or a door. The fade's look is `.fade` in [style.css](../../style.css); keep its transition time equal to `FADE`.

---

## Furniture and edit mode: [room.ts](./room.ts), [Furniture.tsx](./Furniture.tsx), [edit.ts](./edit.ts), [EditRoom.tsx](./EditRoom.tsx)

```ts
export const PIECES = [...]  // room.ts: every movable piece, its name and footprint in tiles (w across, d deep); floor: true for rugs
const DEFAULT = {...}        // where each piece starts: its top-left tile, house-local (tile i, j is centred on x = i, z = j)
const DOORWAY = [...]        // tiles just inside the door, always kept clear of furniture
const SAVE_KEY = 'room-layout-v2' // the visitor's layout is saved in their browser under this; bump it if you change the pieces
const LIFT = 0.25            // piece.ts: how high a piece floats while being moved
const BOB = 0.04             // and how much it bobs (off with reduce motion)
const LINE = 0.02            // EditRoom.tsx: width of the grid lines shown while editing; black at 40% opacity (gridMaterial)
const OK / NO / AIM / OVER   // highlight colours: fits, doesn't fit, empty tile, a piece you could pick up
```

Press G indoors, or the Edit room button, to rearrange the room. The player stands still while you edit. The camera eases up to look down at 70° from further back, so the floor reads as a grid (`EDIT_PITCH`, `EDIT_FAR`, `EDIT_SHIFT` in core/CameraRig.tsx), and back down when you're done. Drag a piece with the mouse or a finger, or move the cursor with the arrows or WASD and press F (or Enter or Space: the interact keys, which follow a remap) to pick it up and put it down. Esc puts the piece in hand back where it came from, or ends edit mode; G (the edit key) or Done ends it too. Reset puts everything back where `DEFAULT` has it.

A piece only goes down where it fits. It must stay inside the room and not overlap other furniture (rugs only clash with rugs, so furniture can stand on them). It can't block the doorway, cover the tiles the player stands on, or shut the player off from the door. A saved layout that breaks any of these rules on load (say, after the pieces change) is dropped in favour of `DEFAULT`, and in development the console warns if `DEFAULT` itself breaks one.

**The chest and the sword:** the chest beside the bed holds the sword (combat/armed.ts). Its use is **Open** until then (a fanfare, and the lines on how to swing), and **Look** after (`CHEST_OPEN`, `CHEST_EMPTY` in Furniture.tsx). It follows the chest if it's moved.

**The room's furniture:** the bed and the chest beside it; the fireplace in the middle of the back wall (**Look**), the log basket on its right; the table with the note and its stool, and the record player, on the right; the coat stand in the back left corner; two pots and the blanket basket down the left; the kotatsu on the right, one floor cushion centred close in on each side (drawn as part of the kotatsu's 4 × 2 piece, `CUSHION_X` = 1.24 from its centre, so they move with it; each has a square collider, `CUSHION_HALF` = 0.34, so the player walks round rather than through them); the rug in front of the door. The column below the bed and the front row left of the door are left clear: the snapshot skill walks out that way.

**Katsu, the house shiba** ([shiba.ts](./shiba.ts), [Dog.tsx](./Dog.tsx)): wanders the room from one free tile to another within `WANDER` = 8 steps, going at least `ROAM` = 3 when it can (`walkableTiles` in room.ts, the same flood from the door that keeps the room passable), at `WALK` = 0.9 units/s, standing `PAUSE` = 1.5 to 5 s between. It waits rather than walk into the player, and if the player bumps into it, it trots off (`TROT` = 1.8) to the free tile furthest from them nearby, so it never traps anyone. Only furniture put down on it moves it straight to another tile; the player standing on its tile just sends it walking. Within `RANGE` = 1.1, **Pet**: it stands facing you for `SIT` = 2.6 s, feet on the floor, and looks at you with its head tipped to one side and up (`PETTED` in ShibaModel.tsx), wags hard, gives a little `woof` (sfx.ts) and three hearts float up; the first pet ever says who it is. It holds still while editing the room, and hops to the nearest free tile if furniture is put down on it. Its collider is `RADIUS` = 0.22. With `?dog=stay` in the URL it stays on its start tile (-2, 0), still pettable: the snapshot skill uses it, so Katsu can't stand in its walk out. Its head looks where it's going, leading the body round turns, or at the player while petted (`LOOK`: up to 0.9 rad from the body). It's the Tripo model ([ShibaModel.tsx](./ShibaModel.tsx), 0.7 tall, facing +z), with the block dog standing in while it loads. The model is rigged but has no clips, so ShibaModel turns it and swings its bones itself. As made it faces 35° off +z with its head a further 27° round and tipped 7°, so it's turned back (`TURN` 0.61 rad) and its head bone straightened and levelled (`HEAD`: -0.46 rad about up, 0.12 about its nose). It walks with a dog's four-beat gait (back left, front left, back right, front right, a quarter-cycle apart), and trots in diagonal pairs when it hurries off after a bump. Each foot stays planted for `STANCE` of the cycle (0.65 walking, 0.5 trotting) while its leg sweeps back `REACH` = 0.42 rad either side of straight down, then lifts, the lower leg folding `LIFT` = 0.7 rad, and swings forward. The stride is timed from its speed and `LEG` = 0.26, the hip-to-foot length, so the feet don't slide. It bobs `BOB` = 0.05 twice a cycle, and eases in and out of its gait (`EASE`) as it sets off and stops, and the tail bone in a wag (`WAG`: 0.25 rad at 7 rad/s, 0.55 at 22 while it sits after a pet). Bone names are Tripo's (`LEGS`, `TAIL`); the loader turns their colons into underscores.

**The fireplace** draws its own flames (`Fire` in Furniture.tsx: three cones that flicker, drawn `FLAME_BRIGHT` = 3 times over white so they bloom), with a soft additive halo in its opening (`HALO`) and a faint pool of warm light on the floor in front (`POOL`), both flickering with the flames, and lights the room from RoomLights.tsx, always mounted like the other room lights. The fireplace neither casts nor takes shadows (`SHADOWLESS`, read by world/Shadows.tsx): with the fire's light just in front of it, its shadow map lit a bright rim round the stones' edges, on desktop only (phones don't give the fire a shadow).

**The golf trophy:** once Gull Rock Links is finished under par ([trophy.ts](./trophy.ts), set by golf/golf.ts), a small gold cup stands in the middle of the mantelpiece, between the model's candle and picture (`TROPHY_AT` in Furniture.tsx, from the fireplace's centre) and moves with it. Using it (**Look**) says what it's for. Start over forgets it with the rest of the golf.

**Tripo models:** a piece with an entry in `MODELS` (Furniture.tsx) shows its model ([PropModel.tsx](./PropModel.tsx)) in place of its blocks, which stand in while it downloads: fitted to `width`, stretched to `depth` and `height` if given, nudged by `z`, laid down on its back with `flat` (for a model made standing up), and lit by `fill` in place of the usual soft studio fill (`{ day: 0.2, night: 0.12 }`). A piece's `glow` (the lamp's block shade) only shows with its blocks. The colliders stay the Build's. In so far: the bed (`width 0.98, depth 1.8`: its shape is stubbier than its 1 × 2 tiles, so it's lengthened), the chest (`width 0.8, z -0.15`: at the back of its tile, its own height), the table (`width 1.9, depth 0.9, height 0.6`: its blocks' footprint and height, as the model is squarer and lower; its note is in the model, and Read still uses `NOTE_AT`), the stool (`width 0.5`) and the fireplace (`width 2.6, depth 0.85, height 1.6, z -0.08`: its blocks' footprint, up to the top of the wall, as the model is squarer; the game's flames show in its opening, and its mantel is at 1.26), the log basket (`width 0.6`, its own height), the rug (`width 2.9, depth 1.9, height 0.03, flat`), the paper lamp (`width 0.46`, its own height of 1.3; `fill { day: 0.35, night: 1 }`, so its pale shade glows and its dark stand barely does), the kotatsu (`width 1.74, depth 1.74, height 0.88`: its blocks' footprint, a little lower than its own shape) and its two cushions (`ZABUTON_MODEL`, one model: `width 0.68, depth 0.68, height 0.16`, squared to their blocks and a little flatter than its own shape). Each piece shows its own copy of a model, so one file can serve several pieces (the pots, later). The models still to make, and their prompts, are in [docs/ART.md](../../../docs/ART.md).

**Adding a piece:** add it to `PIECES` and `DEFAULT` in room.ts, then give it a `Build` in Furniture.tsx: its blocks around the footprint's centre, and its colliders relative to that centre. Something to use on it goes in `USES` there. A piece that draws itself (like the record player) calls `usePiece()` ([piece.ts](./piece.ts)) instead. Edit bar styles are `.edit-*` in [style.css](../../style.css).
