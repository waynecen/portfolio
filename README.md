# portfolio-2026

Wayne Cen's portfolio: an explorable 3D diorama built with React Three Fiber, with a plain HTML version of the same content.

## Stack

- [React Three Fiber](https://r3f.docs.pmnd.rs/) + [three.js](https://threejs.org/) for the 3D world
- React 18, Zustand
- Vite + TypeScript
- Hosted on Vercel

## Getting started

```sh
npm install
npm run dev       # start the dev server
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
```

## Controls

| Input | Action |
|-------|--------|
| W / ↑ | Move away from the camera |
| S / ↓ | Move toward the camera |
| A / ← | Move left |
| D / → | Move right |
| **View as page** / **Play the game** (top right) | Switch between the 3D game and the HTML page |

The game starts automatically on devices with WebGL 2. Visitors who prefer reduced motion get the HTML page first and can opt into the game with the toggle. Without WebGL 2, only the HTML page is shown.

## Project layout

```
index.html          HTML page content (also the no-JS / no-WebGL fallback)
src/main.tsx        First-view loader: view toggle, lazy-loads the 3D chunk
src/style.css       Page styles
src/game/
  mount.tsx         Creates the React root for the game
  Game.tsx          Canvas, lights, floor
  Player.tsx        The player pill and its movement
  input.ts          Keyboard state, kept outside React
  quality.ts        Device tier detection (low / high)
```

## Performance rules

- Keep the first view (HTML, CSS and JS before the 3D chunk) under about 60 KB gzip. The 3D chunk is loaded lazily from `src/main.tsx`.
- Run models through the gltf-transform pipeline before adding them to `public/models`.
- No per-frame allocations in `useFrame`; keep per-frame state out of React.

## Deploy

Vercel builds and deploys `main`. Cache headers are set in `vercel.json`.

## Design

The visual style reference for the HTML page is in [DESIGN.md](DESIGN.md). Contributor conventions (commits, workflow) are in [CLAUDE.md](CLAUDE.md).
