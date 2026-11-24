// Holding the loader up until the models are in (Held.tsx counts the stand-ins on screen). Kept
// apart from the component so its file exports only components (Vite's fast refresh needs that).

const MAX_WAIT = 12 // seconds the loader waits for models at most; after that the stand-ins show and swap in as before
const SETTLE = 2 // frames with nothing held before it counts as done (a model's own chunk, then its file, can suspend in turn)

/** How many model stand-ins are showing now. */
export const holding = { count: 0 }

/** Resolves once no stand-in has been showing for a few frames, or after MAX_WAIT. */
export function whenModelsIn(): Promise<void> {
  const until = performance.now() + MAX_WAIT * 1000
  return new Promise((done) => {
    let clear = 0
    const check = () => {
      clear = holding.count ? 0 : clear + 1
      if (clear >= SETTLE || performance.now() > until) done()
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}
