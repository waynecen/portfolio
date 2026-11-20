import { click } from './sfx'
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

/** Opens a dialogue box with these lines, one per press. */
export function say(lines: string[]) {
  if (lines.length) useGame.setState({ dialogue: { lines, index: 0 } })
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
    if (d.index + 1 < d.lines.length) useGame.setState({ dialogue: { lines: d.lines, index: d.index + 1 } })
    else useGame.setState({ dialogue: null })
  }
  return true
}

/** The context action: advance dialogue, else use the focused interactable. Returns false if nothing happened. */
export function interact(): boolean {
  if (useGame.getState().editing) return false
  if (advance()) return true
  const f = useGame.getState().focus
  if (!f) return false
  click()
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

/** True while dialogue, a panel, a fade between areas or edit mode has the player's attention (movement pauses). */
export function busy() {
  const s = useGame.getState()
  return s.dialogue !== null || s.panel !== null || s.fading || s.editing
}
