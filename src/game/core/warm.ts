// Shader warm-up: before the loader lifts, one frame is drawn with every area showing at once (the
// house, the island, anything else hidden), so three builds their shaders then, behind the loader,
// rather than mid-play on the first trip through the door (a 60 ms hitch with a warm cache, half a
// second with a cold one). WarmUp.tsx does it; Game.tsx waits for it before `gameready`. Kept apart
// from the component so its file exports only components (Vite's fast refresh needs that).

/** The pending warm-up's resolver, if one's been asked for. */
export const warm: { done: (() => void) | null } = { done: null }

/** Resolves after a frame drawn with every area showing. */
export const warmUp = () => new Promise<void>((done) => {
  warm.done = done
})
