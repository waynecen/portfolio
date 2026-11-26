import { track } from './analytics'

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
let ready = false // the game has drawn its first frame

const load = () => (loading ??= import('./game/mount').then((m) => m.mount(game)))

// The parts of a switch that happen at once: the toggle offers the way back, and the loader covers
// the page from the moment the game is chosen until its first frame is drawn.
function choose(next: View) {
  view = next
  document.body.dataset.view = next // read by the game on mount, before any viewchange arrives
  document.body.classList.toggle('loading', next === 'game' && !ready)
  toggle.textContent = next === 'game' ? 'View as page' : 'Play the game'
}

addEventListener('gameready', () => {
  ready = true
  document.body.classList.remove('loading')
}, { once: true })

async function setView(next: View) {
  choose(next)
  if (next === 'game') {
    try {
      await load()
    } catch (e) {
      loading = null // let a later click try again
      if (view === next) choose('page')
      throw e
    }
  }
  if (view !== next) return // switched again while the chunk was loading
  track('View', { view: next })
  document.body.classList.toggle('playing', next === 'game')
  if (next === 'game') game.removeAttribute('aria-hidden')
  else game.setAttribute('aria-hidden', 'true')
  dispatchEvent(new CustomEvent<View>('viewchange', { detail: next }))
}

// The settings' View as a page (SettingsPanel.tsx) asks for the switch from inside the game chunk.
addEventListener('requestview', (e) => void setView((e as CustomEvent<View>).detail))

if (webgl) {
  toggle.hidden = false
  toggle.addEventListener('click', () => setView(view === 'game' ? 'page' : 'game'))
  if (!reduced) {
    choose('game') // the game starts on its own: cover the page now rather than flash it
    const start = () => view === 'game' && setView('game') // unless the visitor chose the page meanwhile
    'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200)
  }
}
