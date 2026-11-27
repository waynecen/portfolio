# Tuning reference

Every constant that changes how the game looks, moves or performs, grouped by system. The notes now live beside the code, one NOTES.md per folder of src/game (below); this page keeps only what applies to the whole site. Each block shows the code as it appears in the source, with a comment explaining what the value does. Change the value in the linked file, not here. If you add or rename a constant, update this page too.

**Units:** distances are in world units (one tile is one unit, the island is 35 tiles across, one screen is about 19 units wide, and the pill is about 1.2 tall). Times are in seconds. Angles are in radians (π ≈ 3.14 is half a turn).

**Damp rates:** several values are rates passed to `MathUtils.damp`, which eases a value toward a target. Higher is snappier. Roughly, a value covers 63% of the remaining gap in `1 / rate` seconds, so a rate of 10 gets 63% of the way in 0.1 s and is basically there by 0.3 s.

---

## Where the notes are

| Folder | What's in it |
| --- | --- |
| [core/](../src/game/core/NOTES.md) | Shared state and plumbing: the store, scenes, input (keys, controller, focus), collision, the camera, the curved world, sound, music and what the browser keeps. |
| [world/](../src/game/world/NOTES.md) | The island itself: tiles, roads and places, trees, the city square, the notice board, the sky, seasons and weather. |
| [player/](../src/game/player/NOTES.md) | The player: movement, the pill and the 3D model, the shadow, dust and light around them, the hat and the sword. |
| [house/](../src/game/house/NOTES.md) | The house: its rooms and doors, the furniture and edit mode, and the record player. |
| [portfolio/](../src/game/portfolio/NOTES.md) | The portfolio itself: projects and their stations, the About sign, the mailbox, the project card and places seen. |
| [life/](../src/game/life/NOTES.md) | Island life: villagers and the tour, bugs, fishing, the shop, daily finds and the things to find for the bag. |
| [combat/](../src/game/combat/NOTES.md) | The light action: the sword, grass and pots, slimes, hearts and shells. |
| [secrets/](../src/game/secrets/NOTES.md) | Hidden things: pearls, the cave behind the waterfall, the islet, the trinkets and the calendar. |
| [golf/](../src/game/golf/NOTES.md) | Mini golf on the islet's east lobe: the ball, putting, the holes. |
| [ui/](../src/game/ui/NOTES.md) | What sits over the game: dialogue, panels, touch controls, photo mode and the welcome back. |

Read the folder's NOTES.md before changing anything in it, rather than this page whole. Each area's CSS is beside its code too (`src/game/<area>/*.css`); src/style.css holds only the page and the loader.

---

## Analytics: [src/analytics.ts](../src/analytics.ts)

Vercel Web Analytics, cookieless, loaded only on the deployed site (never on localhost or in development). It needs **Web Analytics switched on for the project in Vercel's dashboard**, which serves `/_vercel/insights/script.js`. Page views come for free. The events are `View` (`game` or `page`), `Project opened` (its title, from the game), `Link opened` (a link on the page, or the card's or mailbox's links in the game) and `Tour finished`. Custom events need a Vercel plan that includes them; without one they're dropped and page views still count.

---

## World and rendering: [src/game/Game.tsx](../src/game/Game.tsx), [src/game/core/quality.ts](../src/game/core/quality.ts)

```tsx
dpr={[0.5, 1.5]}                            // the range core/adaptive.ts picks within, to hold the frame rate (see core/NOTES.md)
gl={{ antialias: false }}                   // the composer multisamples instead (world/PostFX.tsx); adaptive.ts eases it before the resolution
```

The background, lights and fog come from the time of day; see the next section.

**Chunks** (vite.config.ts, Game.tsx): the first view is the page and the loader alone. The game is split into three.js (about 820 KB, 209 KB gzip; R3F registers all of it, so it can't be tree-shaken), React with R3F (about 270 KB), and the game's own code (about 133 KB). The first two change only with an upgrade, so a returning visitor's browser keeps them across deploys. Parts most visits never reach (the cave, the islet, edit mode, the shop, photo mode) load after the first frame, each behind its own Suspense in Game.tsx (`later()`); a new rarely-seen part can go the same way, as long as nothing loaded up front imports it.

quality.ts decides the device tier:

```ts
return mobile || cores <= 4 || mem <= 4 ? 'low' : 'high' // touch devices, ≤4 CPU cores, or ≤4 GB RAM get the 'low' tier
```

---

## Sound levels: [src/game/core/sfx.ts](../src/game/core/sfx.ts)

Every effect plays through one master gain: the settings' **Effects** slider (0 to 1, default 1) times `LEVEL` = 0.5. Each sound then has its own gain on top. The **Level** column is what reaches the speakers with the slider at full, as a share of full volume (slider × 0.5 × gain). The music is separate, at its own slider (`DEFAULT_VOLUME` = 0.6 in core/music.ts).

| Sound | Gain | Level | Notes |
| --- | --- | --- | --- |
| Footsteps (grass, tatami, road) | `STEP_VOLUME` 0.45, ×0.85 to 1.15 each step | 0.19 to 0.26 | Recorded L/R files. Grass is darkened (`TONE`: low-pass 1800 Hz, +9 dB below 300 Hz). Pitch varies ±3% (`STEP_PITCH`). |
| Footsteps (dock wood) | 0.45 × `STEP_LEVEL.wood` 0.5 | 0.10 to 0.13 | The recordings are about twice as loud as the grass. |
| Footsteps (snow, stone) | 0.45 | 0.19 to 0.26 | Synthesised; pitch varies ±10%. |
| Rain splash under a step | 0.45 × `WET_VOLUME` 0.7, ×0.8 to 1.2 | 0.13 to 0.19 | Synthesised steps only; recorded ones play alone. |
| Whoosh (swing, cast) | `WHOOSH_VOLUME` 0.2 | 0.10 | |
| Sword hit, pot or slime pop | 0.9 | 0.45 | Pitch ±10%. |
| Woof (Katsu petted) | 0.8 | 0.40 | Pitch ±5%. |
| Plop (the float lands) | 0.8 | 0.40 | |
| Reel click | 0.25 | 0.13 | Pitched up 1.5 to 1.7×. |
| Rattle (a bite) | 0.5 and 0.3 | 0.25 and 0.15 | Two clicks. |
| Golf putt (`tap`) | 0.15 to 0.6, by power | 0.08 to 0.30 | Softer putts are higher. |
| Furniture set down (`thud`) | 1, at 0.7× pitch | 0.50 | |
| Dialogue letter (`blip`) | 1 | 0.50 | Each speaker's own pitch, ±4%. |
| Door, front door (recorded), click, pickup, hurt, chime, catch, fanfare, splash | 1 | 0.50 | |

To change one sound, change its gain where it's played (the exports at the bottom of sfx.ts); to change them all, `LEVEL`. Keep footsteps low: they repeat several times a second.

---

## Start-up: [src/main.tsx](../src/main.tsx)

```ts
requestIdleCallback(start, { timeout: 1500 }) // start loading the game when the browser is idle, or after 1.5 s at the latest
setTimeout(start, 200) // fallback for browsers without requestIdleCallback (Safari): start after 0.2 s
```

While the game loads, a black "Loading the island" screen (`.loader` in [style.css](../src/style.css)) covers the page, so the page doesn't flash up first. A little pill, the player's shape, sits above the words (`.loader-pill`). It fades out over 0.4 s once the game has drawn a frame: Game.tsx sends a `gameready` event from the canvas's `onCreated`. The view toggle stays above it.

---

## Link previews and search: [index.html](../index.html), [vite.config.ts](../vite.config.ts)

The Open Graph and Twitter tags in index.html use `%SITE_URL%`, which the build fills in. The build also writes `robots.txt` and `sitemap.xml`. The URL comes from the `SITE_URL` environment variable if it's set; on Vercel it's the production domain (`VERCEL_PROJECT_PRODUCTION_URL`); locally it's `http://localhost:4173`. The preview image is [public/og.jpg](../public/og.jpg), a 1200 × 630 screenshot of the island in the morning with the HUD hidden. Retake it when the island changes a lot. The favicon is [public/favicon.svg](../public/favicon.svg).
