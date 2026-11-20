# Roadmap

Where the island is going: a top-down adventure in the tradition of Animal Crossing, *A Link to the Past* and *Link's Awakening*. It borrows their genre and mechanics, but every character, name and piece of art is our own. It's still a portfolio first: nothing here may stand between a visitor and the projects, and everything shown in the world also exists on the HTML page.

Each item below is sized for one branch or a few commits. The rules in [CLAUDE.md](../CLAUDE.md) apply to all of them:
- the first view stays under about 60 KB gzip
- nothing is allocated in `useFrame`
- models go through the pipeline in [CHARACTER.md](CHARACTER.md)

This replaces the earlier feature roadmap. Its unfinished items are folded in below.

## Done

- **Core loop:** walk, sprint and roll; follow camera; dialogue; record player and music; hearts HUD; touch controls.
- **The island:**
  - a tile grid with roads and an island ringed by cliffs and water
  - seeded trees
  - the house you wake up in, with walk-through doors and its own indoor scene
- **Time of day and weather:** from the visitor's clock. Morning, dawn mist, afternoon rain, golden evening, and night with fireflies and lit windows.
- **Shippable basics:** the About sign, the Contact mailbox, a loading screen, link previews, a favicon, robots and sitemap.
- **Tooling:** the snapshot skill, and the model pipeline (`npm run models`) with a model-ready character rig.
- **Removed on purpose:** the minimap. The island is explored on foot. A treasure map item (D17) is the only "map" planned.

## Phase A: Character and feel *(next)*

1. **Tripo player character.** *(done: public/models/player.glb)* Generate, rig and import an original character to replace the pill. The code is ready: [CHARACTER.md](CHARACTER.md) is the whole process, and the final step is one constant in `src/game/models.ts`.
2. **Curved world.** *(done: curve.ts)* Bend the world downward with distance from the camera, so the horizon rolls away, Animal Crossing-style.
   - One shared `onBeforeCompile` patch is added to every material.
   - Lower the camera angle a little (`HEIGHT` and `DISTANCE` in CameraRig.tsx) so more horizon shows.
3. **Sound effects.** *(done: sfx.ts)*
   - Footsteps by surface (grass, road, tatami floor), a roll whoosh, the door, dialogue blips and UI clicks.
   - A small WebAudio synth like `placeholderTracks.ts`, so there are no audio files, sharing the mute with music.
4. **Particles.** *(done: Dust.tsx, Sparkle.tsx, splashes in Rain.tsx)* Dust puffs on roll and sprint, a sparkle over whatever has focus, and splashes in the rain. All from preallocated pools.
5. **Art pass on props.** Stations become small themed dioramas, one per project. The sign, mailbox and record player get models through the same pipeline as the character.

## Phase B: Light action (Zelda-style)

Gentle by design: nothing is hard, and nothing blocks a project.

6. **Sword.**
   - An Attack input: J or X, and a tap of the touch **B** button (sprint moves to holding B).
   - Hold to charge a spin attack.
   - Hits are tested in an arc against a `hittables` list, the same pattern as `interactables` in interact.ts.
7. **Cuttable grass and pots.**
   - Instanced grass tufts and pots are placed off the roads the way the trees are.
   - Cutting them can drop a heart or **shells** (the island's currency).
   - Pots can be picked up and thrown.
8. **Slimes.**
   - A few wander the outer meadows and hop toward you when you're close.
   - A bump costs half a heart; the sword knocks them back and pops them.
   - They never wander onto the roads to projects.
9. **Hearts that matter.**
   - Damage gives a moment of flashing invulnerability.
   - Walking off the cliff costs half a heart and puts you back on the last road tile.
   - At zero hearts, a soft fade and you wake up in bed at home, nothing lost.
   - Heart pieces: four make a new heart container.

## Phase C: Island life (Animal Crossing-style)

10. **Villagers and a guided tour.**
    - Two or three original animal neighbours wander, chat, and change their lines with the time of day and weather.
    - One offers a **guided tour**: they walk the roads and introduce each project.
11. **Catching.**
    - A bug net for fireflies and butterflies, and fishing at the shore with a simple timing bite.
    - Catches fill a **collection book** panel.
12. **Seasons from the real month.** Blossom in spring, autumn colours, and snow in winter *(winter done: season.ts)*, alongside the time-of-day slots in sky.ts.
13. **Something new each day.** A message bottle on the beach (a tip or fun fact) and a dig spot that moves, both seeded by the date.
14. **Shop and decor.** Spend shells on hats for the character and furniture for the house, placed on the room's tile grid *(moving furniture on the grid done: room.ts, edit.ts)*.

## Phase D: Secrets and a small dungeon

15. **Hidden pearls.** Ten around the island: dug up, under grass, or behind trees. Finding them all unlocks a record for the record player.
16. **The cave behind the waterfall.**
    - A small dungeon in its own scene, the way the house is.
    - Flip-screen rooms inside, *Link's Awakening*-style.
    - A key, a push-block puzzle, a big-slime mini-boss, and a chest with an item that opens a new area: a pier and a boat to a second islet.
17. **Signposts and a treasure map.** Signposts at the crossroads; the map is an item that marks dig spots, not a minimap.

## Phase E: Keeping it and polish

18. **Persistence.** `localStorage` (wrapped in try/catch) for hearts, shells, pearls, the collection, visited stations, decor and volume.
19. **Accessibility.**
    - Keyboard focus in panels, and an `aria-live` mirror of dialogue.
    - A reduced-motion camera.
    - Remappable keys, and gamepad support in input.ts.
20. **Analytics.** Vercel Web Analytics (cookieless), with events for game vs page view, project opens and tour finished.
21. **Photo mode.** A free camera, a few poses, and a screenshot download.

## Phase F: Content and stretch

22. **Real project content.** Real projects in place of the placeholders, with tech tags, an image, and live vs repo links. These are read by `readProjects()` and shown on the card.
23. **Guestbook.** A bulletin board where visitors leave a short note (needs a small backend, such as Vercel KV).
24. **Library.** A building that lists blog posts or notes, mirrored from the page.

## Suggested order

A1 → A2 → A3 and A4 → B6–B9 → C10 → E18. Everything after that can follow appetite.
