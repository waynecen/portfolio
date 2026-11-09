# Project Conventions

React Three Fiber + Vite portfolio: an explorable 3D diorama world. Deployed on Vercel. Branch `main`.

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

## Performance

- Keep the first view (HTML/CSS/JS before the 3D chunk) under about 60 KB gzip; the 3D chunk loads lazily via `src/main.tsx`.
- Run models through the gltf-transform pipeline before adding them to `public/models`.
- No per-frame allocations in `useFrame`; keep per-frame state out of React.
