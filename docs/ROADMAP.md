# Roadmap

Where the island is going: a top-down adventure in the tradition of Animal Crossing, *A Link to the Past* and *Link's Awakening*. It borrows their genre and mechanics, but every character, name and piece of art is our own. It's still a portfolio first: nothing here may stand between a visitor and the projects, and everything shown in the world also exists on the HTML page.

Each item below is sized for one branch or a few commits. The rules in [CLAUDE.md](../CLAUDE.md) apply to all of them:
- the first view stays under about 60 KB gzip
- nothing is allocated in `useFrame`
- models go through the pipeline in [CHARACTER.md](./CHARACTER.md)

This replaces the earlier feature roadmap. Its unfinished items are folded in below.

## Done

- **Core loop:** walk, sprint and roll; follow camera; dialogue; record player and music; hearts HUD; touch controls.
- **The island:**
  - a tile grid with roads and an island ringed by cliffs and water
  - seeded trees, and a forest on the north-west land with a clearing in its middle
  - the house you wake up in, with walk-through doors and its own indoor scene
- **Time of day and weather:** from the visitor's clock. Morning, dawn mist, afternoon rain, golden evening, and night with fireflies and lit windows.
- **Shippable basics:** the About sign, the Contact mailbox, a loading screen, link previews, a favicon, robots and sitemap.
- **Tooling:** the snapshot skill, and the model pipeline (`npm run models`) with a model-ready character rig.
- **Removed on purpose:** the minimap. The island is explored on foot. The treasure map (D17) is the only "map", and it marks dig spots, not the way.

## Phase A: Character and feel

1. **Tripo player character.** *(done: public/models/player.glb)* Generate, rig and import an original character to replace the pill. The code is ready: [CHARACTER.md](./CHARACTER.md) is the whole process, and the final step is one constant in `src/game/models.ts`.
2. **Curved world.** *(done: curve.ts)* Bend the world downward with distance from the camera, so the horizon rolls away, Animal Crossing-style.
   - One shared `onBeforeCompile` patch is added to every material.
   - Lower the camera angle a little (`HEIGHT` and `DISTANCE` in CameraRig.tsx) so more horizon shows.
3. **Sound effects.** *(done: sfx.ts)*
   - Footsteps by surface (grass, road, tatami floor), a roll whoosh, the door, dialogue blips and UI clicks.
   - A small WebAudio synth like `placeholderTracks.ts`, so there are no audio files, sharing the mute with music.
4. **Particles.** *(done: Dust.tsx, Sparkle.tsx, splashes in Rain.tsx)* Dust puffs on roll and sprint, a sparkle over whatever has focus, and splashes in the rain. All from preallocated pools.
5. **Art pass on props.** *(record player done: public/models/recordPlayer.glb)* Stations become small themed dioramas, one per project. The sign, mailbox and record player get models through the same pipeline as the character.

## Phase B: Light action (Zelda-style)

Gentle by design: nothing is hard, and nothing blocks a project.

6. **Sword.** *(done: combat.ts, Sword.tsx)*
   - An Attack input: J, X or a left click, and a tap of the touch **B** button (sprint moves to holding B). A right click puts the rod away, like B.
   - Hold to charge a spin attack.
   - Hits are tested in an arc against a `hittables` list, the same pattern as `interactables` in interact.ts.
7. **Cuttable grass and pots.** *(done: Grass.tsx, drops.ts; pots break but can't be thrown yet)*
   - Instanced grass tufts and pots are placed off the roads the way the trees are.
   - Cutting them can drop a heart or **shells** (the island's currency).
   - Pots can be picked up and thrown.
8. **Slimes.** *(done: Slimes.tsx, with a Slimes switch in the settings)*
   - A few wander the outer meadows and hop toward you when you're close.
   - A bump costs half a heart; the sword knocks them back and pops them.
   - They never wander onto the roads to projects.
9. **Hearts that matter.** *(done: health.ts; the cliff can't be walked off, so its fall isn't needed, and heart pieces wait for something to find them in)*
   - Damage gives a moment of flashing invulnerability.
   - Walking off the cliff costs half a heart and puts you back on the last road tile.
   - At zero hearts, a soft fade and you wake up in bed at home, nothing lost.
   - Heart pieces: four make a new heart container.

## Phase C: Island life (Animal Crossing-style)

10. **Villagers and a guided tour.** *(done: Villagers.tsx: Bramble gives the tour, Mochi chats, Pip keeps the shop)*
    - Two or three original animal neighbours wander, chat, and change their lines with the time of day and weather.
    - One offers a **guided tour**: they walk the roads and introduce each project.
11. **Catching.** *(done: butterflies and fireflies, bugs.ts; catches are in the bag rather than a separate book)*
    - A bug net for fireflies and butterflies, and fishing at the shore with a simple timing bite *(fishing done: the dock, rods and six fish; fishing.ts, Dock.tsx)*.
    - Catches fill a **collection book** panel *(fish are listed in the bag for now)*.
12. **Seasons from the real month.** *(done: blossom and petals in spring, turning trees and falling leaves in autumn)* Blossom in spring, autumn colours, and snow in winter *(winter done: season.ts)*, alongside the time-of-day slots in sky.ts.
13. **Something new each day.** *(done: daily.ts)* A message bottle on the beach (a tip or fun fact) and a dig spot that moves, both seeded by the date.
14. **Shop and decor.** *(done: Pip's shop, shop.ts: four hats, and a lamp, a fern and a bookshelf for the house)* Spend shells on hats for the character and furniture for the house, placed on the room's tile grid *(moving furniture on the grid done: room.ts, edit.ts)*.

## Phase D: Secrets and a small dungeon

15. **Hidden pearls.** *(done: pearls.ts, HiddenPearls.tsx; the record is a generated loop until tracks.ts gives PEARL_TRACK)* Ten around the island: dug up, under grass, or behind trees. Finding them all unlocks a record for the record player.
16. **The cave behind the waterfall.** *(done: Waterfall.tsx, cave.ts, CaveRooms.tsx; the islet: islet.ts, IsletScene.tsx)*
    - A small dungeon in its own scene, the way the house is.
    - Flip-screen rooms inside, *Link's Awakening*-style.
    - A key, a push-block puzzle, a big-slime mini-boss, and a chest with an item that opens a new area: a pier and a boat to a second islet.
17. **Signposts and a treasure map.** *(done: signposts in pois.ts and Signposts.tsx; the map is sold at the shop, shop.ts)* Signposts at the crossroads; the map is an item that marks dig spots, not a minimap.

## Phase E: Keeping it and polish *(done)*

18. **Persistence.** *(done: every module keeps its own part; save.ts lists them, and Start over in the settings forgets them)* `localStorage` (wrapped in try/catch) for hearts, shells, pearls, the collection, visited stations, decor and volume.
19. **Accessibility.** *(done: focus.ts, keymap.ts, gamepad.ts; the dialogue's `aria-live` mirror was already in Dialogue.tsx)*
    - Keyboard focus in panels, and an `aria-live` mirror of dialogue.
    - A reduced-motion camera.
    - Remappable keys, and gamepad support in input.ts.
20. **Analytics.** *(done: analytics.ts; Web Analytics must be switched on in Vercel)* Vercel Web Analytics (cookieless), with events for game vs page view, project opens and tour finished.
21. **Photo mode.** *(done: photo.ts, PhotoHud.tsx; the camera slides and zooms but keeps its angle, for the curved world)* A free camera, a few poses, and a screenshot download.

## Phase F: Content and stretch

22. **Real project content.** Real projects in place of the placeholders, with tech tags, an image, and live vs repo links. These are read by `readProjects()` and shown on the card.
23. **Guestbook.** A bulletin board where visitors leave a short note (needs a small backend, such as Vercel KV).
24. **Library.** A building that lists blog posts or notes, mirrored from the page.

## Phase G: Small touches that respect the visitor

Ten ideas taken from how acclaimed games look after their players, chosen for a visitor with a few minutes, often on a phone, who should leave having seen the projects. The research behind them, with sources, is in [reports/Player experience details in AAA games.md](../reports/Player%20experience%20details%20in%20AAA%20games.md). Most are an afternoon each, and items 25 and 26 lead into the guided tour (C10), persistence (E18) and accessibility (E19).

25. **Places you've seen.** *(done: seen.ts)* Remember which projects, the About sign and the Contact mailbox a visitor has looked at, show "2 of 3 projects seen" in the bag, and let unseen project stations glow softly. *(Animal Crossing's Critterpedia marks, Metroid Dread's glowing unexplored areas)*
26. **"Point me somewhere".** *(removed on purpose in H47: the island is explored, not led through)* One key, and a chip on phones, turns the camera toward the nearest unseen project while wind lines or a bird drift that way. *(The Last of Us Part II's navigation button, Ghost of Tsushima's Guiding Wind)*
27. **Something to do while it loads.** *(done: a pill that hops on the loader; main.tsx)* The loading screen gets a small toy, or the island's map, while the 3D chunk downloads. *(Splatoon 3's lobby, Tears of the Kingdom's map on loading screens)*
28. **Welcome back.** *(done: visits.ts, WelcomeBack.tsx, Leaves.tsx)* A greeting that changes with the days since the last visit, and a little capped, sweepable mess (leaves or weeds) that never costs anything. *(Animal Crossing's absence reactions)*
29. **Calendar moments.** *(done: calendar.ts, Festive.tsx)* The site's anniversary, a few holidays, and one gentle gag that reads the clock, such as a sign at 3am asking whether you shouldn't be asleep. *(K.K. Slider's birthday song, Psycho Mantis)*
30. **Settings with honest assists.** *(done: settings.ts, SettingsPanel.tsx)* Separate music and effects volumes, reduced motion, text size, and a fishing assist (a longer bite window) with a visible marker while it's on. *(The Last of Us Part II's presets, God of War Ragnarök's highlighted changes, Mario Kart's blinking antenna, Hades' God Mode)*
31. **Feedback with rules.** *(done: a fanfare and zoom for a new kind of fish, a short blip for repeats, wet footsteps in the rain)* A brief freeze and zoom on a catch, a jingle per kind of find, wetter footsteps in the rain, each with a written list of when it must not fire. *(Smash's Finish Zoom, Metroid's item fanfare, Animal Crossing's rain sounds)*
32. **A dialogue log, and first-time messages only once.** *(done: log.ts, LogPanel.tsx, sayFirst in interact.ts)* Explanations such as the rod's play in full the first time and shorten after. *(Tears of the Kingdom's dialogue log and shrine banner)*
33. **Silly secrets.** *(done: secrets.ts, Trinkets.tsx; confetti steps, tiny you, black and white)* Three or four hidden trinkets, each switching on a harmless world effect: confetti steps, low gravity, a big head, black and white. *(Halo's skulls)*
34. **Lines that react and hide real tips.** *(done for signs: the notice board, notice.ts; villagers still to come)* Signs and, later, villagers say different things by weather, hour or what you're carrying, with real tips tucked into the jokes. *(Smash's Palutena's Guidance, Valorant's agent voice lines)*

Left out on purpose: a like-only guestbook (needs a backend; see F23), reshaping the island's terrain for Breath of the Wild's triangle rule (use it for new land instead), and a fake-crash gag (on a portfolio, a recruiter might believe it).

## Phase H: Leaner code, a quieter guide *(done, but for 50)*

The game has grown to 107 files in one flat folder, a 710-line TUNING.md and a 426-line style.css, and the same patterns are written out again and again. Every change has to read more than it touches, which costs Claude tokens and makes mistakes likelier. This phase gives each part of the portfolio its own compartment, writes the shared patterns once, and lets the visitor explore rather than be led. Moves come first, so the refactors after them are small diffs.

### Compartments (fewer tokens per change)

35. **One folder per area.** *(done: src/game/core, world, player, house, secrets, life, combat, portfolio, ui)* Split `src/game` into:
    - `core/`: store, scene, state, input, keymap, gamepad, focus, collision, curve, save, settings, sfx, music
    - `world/`: island, trees, roads, grid, pois, layout, sky, season, weather
    - `player/`: the player, its characters, the hat, the sword
    - `house/`: the house, furniture, edit mode, the record player
    - `secrets/`: pearls, the cave, the islet, trinkets, the calendar
    - `life/`: villagers, bugs, fishing, the shop, daily finds
    - `combat/`: slimes, grass and pots, hearts, drops
    - `portfolio/`: projects, stations, places, the mailbox, the project card, places seen
    - `ui/`: panels, HUD, dialogue, touch controls, photo mode

    Only moves and import paths change, one commit per folder. Renames that only change case need two steps on Windows.
36. **Tuning notes beside the code.** *(done: a NOTES.md per folder; TUNING.md is the index)* Each folder gets a short `NOTES.md` with its constants and rules, cut from TUNING.md, which becomes a one-page index. A change to fishing then reads about 40 lines, not 710.
37. **A map in CLAUDE.md.** *(done)* A "Where things live" table (folder, what's in it, entry file), and a rule to read that folder's NOTES.md first and never read TUNING.md or style.css whole. CLAUDE.md itself stays short.
38. **CSS beside its component.** *(done: the first view's CSS is 0.9 KB gzip, from 4.7)* Split style.css into one file per area (`ui/panels.css`, `ui/hud.css`, `ui/touch.css`, `ui/photo.css`), each imported by the components that use it, and break up the one-line rules. Game CSS then loads with the 3D chunk instead of in the first view (4.7 KB gzip today).

### One copy of each pattern

39. **A `persisted()` store helper** *(done: core/persist.ts; Start over clears everything but the preferences, so it needs no list)* replaces 19 hand-written localStorage load-and-save blocks: a key, a default and a check, saved on change and wrapped in try/catch. Each store registers its key, so save.ts's Start over can't miss one.
40. **One `<Panel>` component** *(done: ui/Panel.tsx)* for the bag, log, settings, shop and touch menu: the header and ×, Escape and the panel's own key to close, and focus on open. That removes five copies of the same code.
41. **One HUD chip component** *(done: ui/Chip.tsx)* for the buttons at the top left, with shared CSS in place of a rule block each.
42. **One tile-occupancy module.** *(done: world/tiles.ts; every placement comes out as before)* Roads, buildings, the square, trees and places are worked out once. Grass, pickups, slimes, pearls, daily finds and trees ask it `free(i, j, margin)` instead of each building its own blocked set.
43. **One hint helper.** *(done: hint() in core/keymap.ts)* `hint('bag', 'Tap B')` names the bound key on a keyboard and the button on touch. It replaces 13 `isTouch ?` ternaries and notice.ts's local `key()`.
44. **A dead-code sweep.** *(done: 2 dead exports removed, 25 made local)* Run a one-off unused-export check (`npx knip`, not added as a dependency), then remove unused exports, files and comments that name old keys or positions.

### Performance

45. **A smaller 3D chunk.** *(done: three.js and React in their own chunks, the game's code 133 KB; the cave, islet, edit mode, shop and photo mode load later)* It's 1.2 MB (346 KB gzip), over Vite's warning. Load rarely used parts on demand: the cave and islet, edit mode, photo mode and the shop. Check three.js is tree-shaken, and measure before and after.
46. **Less work per frame.** *(done: core/sceneFrame.ts on 15 visual callbacks; no meshes needed merging)* Audit every `useFrame`: hidden scenes' components still run theirs. Skip them while their scene isn't shown, and merge static meshes where draw calls add up.

### Explore, don't be led

47. **Remove "Point me somewhere".** *(done)* Drop G, the Where to? chip and menu item, the guide wind and the camera glide (guide.ts, GuideWind.tsx). Also drop the hints that mention it: on the notice board, in a bottle tip, in the keymap and on the controller's LB. The world keeps its own cues: signposts, the soft glow on unseen stations, and Bramble's tour for whoever asks. G26 becomes "removed on purpose".
48. **Fewer instructions up front.** *(done; the sword is taught on the first slime bump)* The welcome note covers walking and using things, and stops there. Everything else is met in the world, with first-time lines (`sayFirst`) and the Keys list in the settings. The notice board's lines hint rather than direct.
49. **"View as page" moves into the settings.** *(done)* While playing, the button at the top hides and the settings gain a View as a page row. A visually hidden skip link stays first in the tab order, because the page is the accessible version. On the page, Play the game stays where it is. Without WebGL or with reduced motion the page is still the starting view.
50. **The bag and its inventory: to be decided.** Parked until you've settled what the inventory should be.

Suggested order for Phase H: 47 → 49 → 48 (small and visible), then 35 → 36 → 37 (moves, while nothing else is changing), then 39 → 40 → 41 → 42 → 43, then 44, 45 → 46, and 38 last.

## Phase I: Mini golf *(left: the moving gate, the round panel and trophy, the hole-in-one camera nudge)*

A small putting course to wander into: four or five holes, each a little diorama, played with the controls the visitor already has. It's optional, quick (a hole is under a minute), and never stands between a visitor and the projects. The holes, art and names are our own; it borrows only the genre. It lives in `src/game/golf/` with its own NOTES.md and loads on demand like the cave (H45). It's on the islet, out in the open: the islet grew an east lobe for it (`LINKS` in Island.tsx), and rowing out is the way in.

51. **The course and the way in.** *(done, on the islet: Gull Rock Links, hole 1, with a sign at the tee; the boat is the way in, so there's no clubhouse door or separate scene, and the camera follows the player as everywhere else on the island)* A clubhouse hut and a flag on the island, reached by a road (a place in pois.ts), with a door into a new `'golf'` scene (scene.ts, like the cave). Each hole is a room-sized green with the camera held on it, as in the cave (CameraRig.tsx), sliding to the next hole once one is sunk. A villager at the hut explains it once (`sayFirst`). Leaving through the hut's door at any point is always allowed.
52. **The ball.** *(done: golf/golf.ts; the kerb and blocks are its own rectangles rather than collision.ts shapes, since the ball mustn't meet the player's colliders)* A small physics step of its own in `golf/ball.ts`: a 2D ball on the green with rolling friction, fixed-step substeps so a hard putt can't tunnel, and bounces off walls that reflect the velocity, using the box and circle shapes collision.ts already has. It drops in when it rolls over the cup slowly enough, and lips out when it's too fast. Allocation-free, like everything per frame.
53. **Putting with the controls already there.** *(done: the use key steps up to the ball, and the use key or Escape steps away; core/putt.ts carries the sword key to the golf)*
    - **Keyboard and controller:** walk to the ball, turn to aim, hold the sword key or button to charge (the same hold as the sword's spin, combat.ts), and let go to putt. The stick or the walk keys fine-tune the aim while charging.
    - **Mouse:** drag back from the ball and let go, like a slingshot, with left click.
    - **Touch:** the same drag on the screen.
    - **On every device:** a short dotted aim line shows the first bounce, and the power shows as a meter in the reel bar's style (ReelBar.tsx). Every input names its keys through `hint()`.
54. **Holes that teach one idea each.** *(done but the moving gate: four holes, The Straight, Round the Wall (a bank), The Tilt (a slope) and Two Ways, on the one green, which changes round the player after each hole)* A straight first putt, a bank shot off a wall, a slope (tiles that push the ball, drawn as stripes), a moving gate timed with a swing of the sword, and a last hole with two routes. Each has a par, a tee and a cup, written as data (`golf/holes.ts`) so a hole is added without new code.
55. **A scorecard that's kind.** *(mostly done: the round against par on the scorecard and in words at the end, "Pick it up" after twice par, the best round saved, a shell per hole at par or under; the end-of-round `<Panel>` and the house trophy are still to do)* Strokes per hole against par in a `<Panel>` at the end. There's no limit on strokes: after twice par, a "pick it up" button moves on with par plus two. The best round is saved (`readSaved`/`writeSaved`, a progress key). Shells for every hole at par or under, and a small trophy for the house the first time the course is finished under par.
56. **Feel and feedback, with rules.** *(sounds done: the tap, the rattle and the hole-in-one fanfare; the camera nudge is still to do)* A soft tap on the putt (louder for harder ones), a rattle in the cup, and a short fanfare for a hole in one (sfx.ts, synthesized). A brief camera nudge toward the cup on a hole in one only, and never with reduced motion. Photo mode works on the course.
57. **Assists, honestly.** *(done: Gentle greens in the settings, with "Assist on" on the scorecard)* A longer aim line, and a "gentle greens" setting that adds friction near the cup, in the settings with the fishing assist. While one is on, it shows on the scorecard, like "Assist on" on the fishing prompt.
58. **Saved, counted, documented.** *(done)* The best round and the trophy count as progress, so Start over forgets them. A `Golf finished` analytics event fires with the strokes against par. `golf/NOTES.md` gets the constants (friction, power, cup radius, lip-out speed) and the hole format.

Suggested order for Phase I: 51 → 52 → 53 (one hole playable end to end), then 54, 55, 56, 57, 58.

## Phase J: Fidelity (stylised AAA)

Closer to a big studio's finish, in the Animal Crossing / Tears of the Kingdom direction rather than photoreal: the cosy diorama stays, and gains soft shadows, glowing lamps, a grade per time of day, wind, better water and sky, and real models in place of placeholder blocks. One look for every device, tuned to stay smooth on a mid-range phone; the resolution adapts instead of effects being cut. Code does the rendering; models come from Tripo through `npm run models` (lit exports, a soft `FILL`, as with the record player).

59. **Soft real-time shadows.** *(done: world/Shadows.tsx)* The sun casts soft shadows from everything solid, in a shadow box that follows the player (snapped to its texels so edges don't shimmer), fixed over the room indoors and the cave. The curve (curve.ts) is left out of the shadow pass, so casters and receivers agree everywhere. Lanterns and the player's glow don't cast (six passes each). The blob shadow under the player stays, fainter, as contact shade.
60. **One post-processing pass.** *(done: world/PostFX.tsx)* Tone mapping, a colour grade per time-of-day slot (soft morning, warm evening, cool night), bloom on what glows (lantern shades, windows at night, fireflies, sparkles) and a light vignette, merged into one pass with the `postprocessing` library, in the game chunk only.
61. **A steady frame rate.** *(done: core/adaptive.ts)* The resolution steps down when frames run slow and back up when there's room, with a gap between the two so it doesn't flap.
62. **Ambient occlusion, baked.** Darker block bottoms and inner corners from the shared geometry helpers (core/geometry.ts), and contact shade where props meet the ground. No screen-space AO: too heavy for phones.
63. **A soft stylised material.** *(done: core/shading.ts)* One shared patch on every Lambert material, beside the curve: wrapped diffuse, a warm rim light, and shadows tinted cool rather than grey.
64. **Wind.** Trees, grass, flowers and the lantern sway from one shared time uniform in the same patch, and the grass parts round the player.
65. **Water.** A stylised shader: shore foam, slow ripples, sun glints; wakes behind the boat and round the dock posts.
66. **Sky and air.** A gradient sky dome with drifting clouds for each slot, height fog, light shafts at dawn and evening (cheap cards), and dust motes in the room's light.
67. **Character polish.** Blinks, footprints in sand and snow, a squash on landing, and eyes that turn toward whatever has focus.
68. **Camera and photo mode.** A tilt-shift depth of field in photo mode, a slight framing lag, and a small shake only for big moments (never with reduced motion).
69. **Tripo art pass** (extends A5). A prompt list in [CHARACTER.md](./CHARACTER.md) for the stations (one diorama per project), villagers, trees, the house, the sign, the mailbox and the furniture. Each model swaps in behind its placeholder, as the record player did.
70. **A fidelity budget.** Frame time and draw calls written down in [TUNING.md](./TUNING.md), and checked by the snapshot run on a slowed-down profile.

Suggested order for Phase J: 59 → 60 → 61, then 63 → 62 → 64, 66 → 65, 67, 68. 69 runs alongside, as models arrive.

## Suggested order

A1 → A2 → A3 and A4 → B6–B9 → C10 → E18. Everything after that can follow appetite.

For Phase G: 25 → 26 → 32 → 31 → 28 → 29 → 30 → 27 → 33 → 34. The first four do the most for a first visit.
