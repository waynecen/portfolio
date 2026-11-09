// Keep the first view tiny: the 3D chunk is fetched only if the device can and should run it.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const webgl = (() => {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
})()

if (webgl && !reduced) {
  const start = () => import('./game/mount').then((m) => m.mount(document.getElementById('game')!))
  'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200)
}
