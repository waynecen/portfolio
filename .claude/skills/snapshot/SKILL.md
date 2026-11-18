---
name: snapshot
description: Build the site locally and screenshot it (first page view, the house, the island, and the house on a phone) with headless Edge. Run after every push to main, or whenever asked for snapshots or screenshots of the current build.
---

# Snapshot the local build

Screenshots the **local production build**, not the Vercel deployment: the Vercel URLs are behind deployment protection, so a headless browser only reaches the login page. The build is the same code Vercel deploys from the pushed commit.

## Run

```sh
node .claude/skills/snapshot/snapshot.mjs
```

The script:

1. Runs `vite build`, then serves `dist/` with `vite preview` on port 4179. It closes the server itself afterwards.
2. Opens headless Edge with software WebGL (SwiftShader), so no GPU is needed. Set `SNAPSHOT_BROWSER=chrome` to use Chrome instead.
3. Saves PNGs to `snapshots/<short sha>/`, or `snapshots/<short sha>-dirty/` when the working tree has uncommitted changes. `snapshots/` is gitignored. Pass a folder as the first argument to save somewhere else.
4. Prints each file's path, and exits with code 1 if a shot failed or the page logged an error.

The shots:

- `desktop-page.png`: the plain HTML page, which is the first view. The script turns on reduced motion so the game doesn't start.
- `desktop-house-morning.png` and `desktop-house-night.png`: the room the game starts in, at 1280 × 720.
- `desktop-island-<slot>.png` for morning, dawn, afternoon, evening and night: the island after walking out of the front door. It holds D, then S, from the bed spawn. If a layout change blocks that route, update the walk in the script.
- `desktop-character.png`: a close-up of the player on the doorstep in the morning, cropped from the island shot. It shows the pill, or the 3D model when `PLAYER_MODEL` is set in `src/game/models.ts`. Check it stands on the ground, faces the camera and isn't clipped.
- `mobile-house.png`: the starting room at 390 × 844 with touch controls.

Each game shot pins the clock with `?hour=` (see `HOURS` in the script), so shots compare between runs whatever the real time. It takes about two minutes.

## After running

1. Open every PNG with the Read tool and look at it. Check that the scene rendered (not blank or black), the HUD sits where it should, and nothing overlaps or clips.
2. Report anything that looks wrong, along with any errors the script printed.
3. Show the user the snapshot paths. If the script exited non-zero, say so and include its output.
