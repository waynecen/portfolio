import { fishing, reel } from './fishing'
import { markSeen } from './seen'
import { click } from './sfx'
import { playerPos } from './state'
import { useGame, type Panel } from './store'

/** What the card at the bottom of the screen shows while an interactable has focus: a project, or the contact links. */
export type Card = {
  title: string
  description: string
  /** Opened by using the interactable; empty if it opens nothing. */
  url: string
  /** Label for that action on the card. Default "Open project". */
  action?: string
  /** Extra links listed on the card, each clickable or tappable. */
  links?: { label: string; href: string }[]
}

/** Something in the world the player can walk up to and use with E / Enter / A. */
export type Interactable = {
  x: number
  z: number
  /** How close (world units) the player must be for it to take focus. */
  range: number
  /** Verb shown in the prompt, e.g. "Read". */
  prompt: string
  onInteract: () => void
  /** A card to show while this has focus. */
  card?: Card
  /** The place this is, for the places-seen list (seen.ts): seen once its card shows, or once used if it has none. */
  seen?: string
}

// Plain array scanned once per frame by <Interactions>; entries are added and removed by components.
export const interactables: Interactable[] = []

/** Adds an interactable; returns a function that removes it (use as an effect cleanup). */
export function register(item: Interactable): () => void {
  interactables.push(item)
  return () => {
    const i = interactables.indexOf(item)
    if (i >= 0) interactables.splice(i, 1)
    if (useGame.getState().focus === item) useGame.setState({ focus: null })
  }
}

/** Set by <Dialogue> while a line is typing out, so a press can finish the line instead of skipping it. */
export const typer = { done: true, finish: () => {} }

const SAY_RANGE = 1.5 // with nothing in focus, a dialogue belongs to the spot it opened at, this far round

/**
 * Opens a dialogue box with these lines, one per press. It belongs to whatever the player is using
 * (or the spot they're standing on), and closes if they walk away from it.
 */
export function say(lines: string[]) {
  if (!lines.length) return
  const f = useGame.getState().focus
  const at = f ? { x: f.x, z: f.z, range: f.range } : { x: playerPos.x, z: playerPos.z, range: SAY_RANGE }
  useGame.setState({ dialogue: { lines, index: 0, at } })
}

export function closeDialogue() {
  if (useGame.getState().dialogue) useGame.setState({ dialogue: null })
}

/** Advances the open dialogue (finish typing, next line, or close). Returns false if none is open. */
export function advance(): boolean {
  const d = useGame.getState().dialogue
  if (!d) return false
  if (!typer.done) typer.finish()
  else {
    click()
    if (d.index + 1 < d.lines.length) useGame.setState({ dialogue: { ...d, index: d.index + 1 } })
    else useGame.setState({ dialogue: null })
  }
  return true
}

/** The context action: advance dialogue, else use the focused interactable. Returns false if nothing happened. */
export function interact(): boolean {
  if (useGame.getState().editing) return false
  if (advance() || reel()) return true
  const f = useGame.getState().focus
  if (!f) return false
  click()
  if (f.seen) markSeen(f.seen)
  f.onInteract()
  return true
}

/** Opens a panel such as the record player. */
export function openPanel(panel: Panel) {
  useGame.setState({ panel })
}

export function closePanel() {
  if (useGame.getState().panel) useGame.setState({ panel: null })
}

/** True while dialogue, a panel, a fade between areas, edit mode or fishing has the player's attention. */
export function busy() {
  return useGame.getState().dialogue !== null || held()
}

/** True while the player can't move: a panel, a fade between areas, edit mode or fishing. Dialogue doesn't hold them. */
export function held() {
  const s = useGame.getState()
  return s.panel !== null || s.fading || s.editing || fishing()
}
