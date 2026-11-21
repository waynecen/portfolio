import { create } from 'zustand'
import { ABOUT_AT, CONTACT_AT } from './places'
import { projects, stationPos } from './projects'

// Places the visitor has looked at: each project, the About sign and the Contact mailbox. Kept in
// this browser, shown in the bag ("2 of 3 projects seen"), and unseen project stations glow
// (Station.tsx), so a visitor can tell at a glance what's left. An interactable says which place it
// is with its `seen` id (interact.ts); it counts once its card has shown, or once it's been used if
// it has no card.

/** A place worth seeing, and where it stands on the island (the guide points there: guide.ts). */
export type Place = { id: string; name: string; kind: 'project' | 'about' | 'contact'; x: number; z: number }

/** Every place worth seeing, in the order the bag lists them. */
export const PLACES: Place[] = [
  ...projects.map((p, i) => ({ id: projectPlace(p.title), name: p.title, kind: 'project' as const, ...stationPos[i] })),
  { id: 'about', name: 'About', kind: 'about', ...ABOUT_AT },
  { id: 'contact', name: 'Contact', kind: 'contact', ...CONTACT_AT },
]

/** The place id of a project, by its title (from the HTML page). */
export function projectPlace(title: string) {
  return `project:${title}`
}

const SAVE_KEY = 'seen-v1'

function load(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '[]')
    return Array.isArray(saved) ? PLACES.filter((p) => saved.includes(p.id)).map((p) => p.id) : []
  } catch {
    return []
  }
}

/** The ids of every place seen so far, in the order of PLACES. */
export const useSeen = create<{ seen: string[] }>(() => ({ seen: load() }))

/** Marks a place as seen (once). Unknown ids, such as a project since renamed, are ignored. */
export function markSeen(id: string) {
  const { seen } = useSeen.getState()
  if (seen.includes(id) || !PLACES.some((p) => p.id === id)) return
  const next = PLACES.filter((p) => p.id === id || seen.includes(p.id)).map((p) => p.id)
  useSeen.setState({ seen: next })
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next))
  } catch {
    // private mode or storage full: remembered until the page closes
  }
}
