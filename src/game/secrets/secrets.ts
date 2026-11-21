import { create } from 'zustand'
import { say } from '../core/interact'
import { isTouch } from '../core/quality'
import { chime } from '../core/sfx'

// Odd trinkets hidden around the island, each switching on a harmless, silly change to the world
// (Halo's skulls, in spirit). Finding one switches its effect on; the settings panel switches each
// found one on and off again. Nothing depends on them and nothing is lost by missing them. Where
// they wait is in Trinkets.tsx; what they do is read by Dust.tsx (confetti), Player.tsx (tiny) and
// style.css (black and white, via body.secret-mono).

export type SecretId = 'confetti' | 'tiny' | 'mono'

export type Secret = {
  id: SecretId
  name: string
  /** What switching it on does, for the settings panel. */
  effect: string
  /** Its colour, in the world and on its toggle. */
  color: string
  /** The tile it would like to wait on (Trinkets.tsx moves it to the nearest clear one). */
  at: { i: number; j: number }
}

export const SECRETS: Secret[] = [
  { id: 'confetti', name: 'Party popper', effect: 'Confetti steps', color: '#e0566a', at: { i: -23, j: -18 } },
  { id: 'tiny', name: 'Shrinking cap', effect: 'Tiny you', color: '#5b9bd5', at: { i: 16, j: -1 } },
  { id: 'mono', name: 'Old photograph', effect: 'Black and white', color: '#9a9a9a', at: { i: 1, j: -5 } },
]

const KEY = 'secrets-v1'

type State = { found: SecretId[]; on: SecretId[] }

function load(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<State>
    const ids = SECRETS.map((s) => s.id)
    const keep = (list: unknown) => (Array.isArray(list) ? ids.filter((id) => list.includes(id)) : [])
    return { found: keep(saved.found), on: keep(saved.on) }
  } catch {
    return { found: [], on: [] }
  }
}

export const useSecrets = create<State>(() => load())

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(useSecrets.getState()))
  } catch {
    // private mode or storage full: kept until the page closes
  }
}

/** True while a found secret's effect is on. Cheap enough to call every frame. */
export const secretOn = (id: SecretId) => useSecrets.getState().on.includes(id)

/** Switches a found secret's effect on or off (the settings panel). */
export function setSecret(id: SecretId, on: boolean) {
  const s = useSecrets.getState()
  if (!s.found.includes(id)) return
  useSecrets.setState({ on: on ? [...s.on.filter((x) => x !== id), id] : s.on.filter((x) => x !== id) })
  save()
}

/** Picks up a trinket: it's found for good, and its effect goes on. */
export function findSecret(id: SecretId) {
  const s = useSecrets.getState()
  if (s.found.includes(id)) return
  useSecrets.setState({ found: [...s.found, id], on: [...s.on.filter((x) => x !== id), id] })
  save()
  chime()
  const secret = SECRETS.find((x) => x.id === id)!
  say([
    `You found the ${secret.name.toLowerCase()}! Something feels different: ${secret.effect.toLowerCase()}.`,
    `${isTouch ? 'Open the menu and tap Settings' : 'Press O for the settings'} to switch it off again.`,
  ])
}

// Black and white is a CSS filter on the game, mirrored on <body>.
function mirror() {
  document.body.classList.toggle('secret-mono', secretOn('mono'))
}
mirror()
useSecrets.subscribe(mirror)
