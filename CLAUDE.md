# Project Conventions

React Three Fiber + Vite portfolio: an explorable 3D diorama world. Deployed on Vercel. Branch `main`.

## Where things live

| Path | What | Entry |
| --- | --- | --- |
| `src/main.tsx`, `index.html` | The first view: the HTML page, the loader, the page/game switch | `main.tsx` |
| `src/game/Game.tsx` | The game's scene graph and HUD, put together | `mount.tsx` |
| `src/game/core/` | Store, scenes, input, keys, controller, focus, collision, camera, sound, music, saving | `store.ts` |
| `src/game/world/` | Island, roads and places, trees, city square, notice board, sky and weather | `Island.tsx`, `layout.ts` |
| `src/game/player/` | Movement, the pill and model, hat, sword | `Player.tsx` |
| `src/game/house/` | House, furniture, edit mode, record player | `House.tsx` |
| `src/game/portfolio/` | Projects, stations, About sign, mailbox, project card, places seen | `projects.ts` |
| `src/game/life/` | Villagers, bugs, fishing, shop, daily finds, things for the bag | `Villagers.tsx` |
| `src/game/combat/` | Sword, grass and pots, slimes, hearts, shells | `combat.ts` |
| `src/game/secrets/` | Pearls, cave, islet, trinkets, calendar | `pearls.ts` |
| `src/game/ui/` | Dialogue, panels, touch controls, photo mode, welcome back | `Dialogue.tsx` |
| `docs/` | `ROADMAP.md`, `CHARACTER.md`, `TUNING.md` (site-wide notes and the index) | |

Before changing a folder, read its `NOTES.md`: its constants and rules. Don't read `docs/TUNING.md` whole; search it. Each area's CSS is beside its code (`src/game/<area>/*.css`), imported in order by `Game.tsx`; `src/style.css` holds only the page. Keep each `NOTES.md` current when its constants change.

## Commits

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`.
- Subject: imperative mood, about 50 characters, no trailing period.
- Add a body only when needed, and explain why rather than what.
- One logical change per commit; do not mix features, refactors, and docs.
- Always prefer splitting commits: when changes cover more than one concern, make separate commits, even if they touch the same file (stage by hunk).
- Do not add a "Committed:" date line; git already records the timestamp.

## Workflow

- Show `git status` and `git diff` before committing.
- Stage specific files, not `git add -A`.
- Work on a branch (e.g. `feat/player-movement`); keep `main` for finished work.
- Never skip hooks, force-push, or rewrite pushed history.
- Only commit or push when asked.
- After every push, run the `snapshot` skill (`.claude/skills/snapshot/`) to screenshot the local production build, look at the shots, and report anything off.

## Performance

- Keep the first view (HTML/CSS/JS before the 3D chunk) under about 60 KB gzip; the 3D chunk loads lazily via `src/main.tsx`.
- Run models through the gltf-transform pipeline before adding them to `public/models`.
- No per-frame allocations in `useFrame`; keep per-frame state out of React. Visual work in one area uses `useSceneFrame` (core/sceneFrame.ts), so it stops while that area is hidden.
- Use the shared helpers rather than repeating them: `readSaved`/`writeSaved` (core/persist.ts), `<Panel>` and `<Chip>` (ui/), `clear()` for free tiles (world/tiles.ts), `hint()` for control names (core/keymap.ts).
