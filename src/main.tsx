// Keep the first view tiny: the 3D chunk is fetched only if the device can and should run it.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const webgl = (() => {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
})()

type View = 'game' | 'page'

const game = document.getElementById('game')!
const toggle = document.getElementById('view-toggle')!
let view: View = 'page'
let loading: Promise<void> | null = null

const load = () => (loading ??= import('./game/mount').then((m) => m.mount(game)))

async function setView(next: View) {
  view = next
  document.body.dataset.view = next // read by the game on mount, before any viewchange arrives
  if (next === 'game') await load()
  if (view !== next) return // switched again while the chunk was loading
  document.body.classList.toggle('playing', next === 'game')
  if (next === 'game') game.removeAttribute('aria-hidden')
  else game.setAttribute('aria-hidden', 'true')
  toggle.textContent = next === 'game' ? 'View as page' : 'Play the game'
  dispatchEvent(new CustomEvent<View>('viewchange', { detail: next }))
}

if (webgl) {
  toggle.hidden = false
  toggle.addEventListener('click', () => setView(view === 'game' ? 'page' : 'game'))
  if (!reduced) {
    const start = () => setView('game')
    'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200)
  }
}
