import { create } from 'zustand'
import { say, sayFirst } from '../core/interact'
import { landed } from '../core/sfx'
import { playerVel } from '../core/state'

// Catching bugs: butterflies over the meadows by day (Butterflies.tsx) and fireflies at night
// (Fireflies.tsx). Walk up to one and catch it (E, Enter or A); come in at a sprint and it gets
// away. Catches are counted in the bag, next to the fish, and kept in this browser.

export type BugId = 'white' | 'morpho' | 'firefly' | 'goldfly'

export type Bug = { id: BugId; name: string; description: string; color: string }

/** Every bug, in the order the bag lists them. Placeholders: change names and words freely. */
export const BUGS: Bug[] = [
  { id: 'white', name: 'Cabbage white', description: 'The most ordinary butterfly there is, and still lovely.', color: '#f4f1e8' },
  { id: 'morpho', name: 'Sky morpho', description: 'Its wings are the exact blue of a clear afternoon.', color: '#4f8fd9' },
  { id: 'firefly', name: 'Firefly', description: 'It blinks in your hands like it’s trying to say something.', color: '#ffe680' },
  { id: 'goldfly', name: 'Golden firefly', description: 'Brighter than the rest, and it knows it.', color: '#f2b233' },
]

export const MORPHO = 0.15 // chance a butterfly is a sky morpho
export const GOLDFLY = 0.08 // chance a firefly is a golden one
const STEADY = 1.2 // at more than this speed (relative to walking), a bug sees you coming and flees

const KEY = 'bugs-v1'
function load(): Partial<Record<BugId, number>> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>
    const out: Partial<Record<BugId, number>> = {}
    for (const b of BUGS) if (typeof v[b.id] === 'number') out[b.id] = v[b.id] as number
    return out
  } catch {
    return {}
  }
}

/** How many of each bug have been caught. */
export const useBugs = create<{ caught: Partial<Record<BugId, number>> }>(() => ({ caught: load() }))

/**
 * Tries to catch a bug of kind `id`. Returns false (and says so) if the player came in too fast,
 * so the caller can make it flee.
 */
export function tryCatch(id: BugId): boolean {
  if (playerVel.speed > STEADY) {
    sayFirst('bug-fled', ['It saw you coming and got away!', 'Walk up slowly to catch a bug.'], ['It got away!'])
    return false
  }
  const caught = useBugs.getState().caught
  const first = !caught[id]
  const next = { ...caught, [id]: (caught[id] ?? 0) + 1 }
  useBugs.setState({ caught: next })
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // private mode or storage full: kept until the page closes
  }
  landed(first)
  const bug = BUGS.find((b) => b.id === id)!
  const lines = [`You caught a ${bug.name.toLowerCase()}!`]
  if (first) lines.push(`${bug.description} It’s in your bag.`)
  else lines.push('You let it go again. It doesn’t seem to mind.')
  say(lines)
  return true
}
