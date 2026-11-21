import { readSaved, writeSaved } from '../core/persist'
// Visits to the island from this browser: when the first was, when the last one was and how many
// there have been. A reload within SAME_VISIT counts as the same visit. Read once at load, so the
// welcome back (WelcomeBack.tsx), the leaves to sweep (Leaves.tsx) and the calendar moments
// (calendar.ts) all agree on how long the visitor has been away.

const KEY = 'visits-v1'
const SAME_VISIT = 30 * 60 * 1000 // a reload within half an hour is the same visit
const DAY = 24 * 60 * 60 * 1000

type Saved = { first: number; last: number; count: number }

function load(): Saved | null {
  const v = (readSaved(KEY) ?? null) as Saved | null
  return v && typeof v.first === 'number' && typeof v.last === 'number' && typeof v.count === 'number' ? v : null
}

const now = Date.now()
const saved = load()
const same = !!saved && now - saved.last < SAME_VISIT
const count = saved ? saved.count + (same ? 0 : 1) : 1

/**
 * This visit. `daysAway` is whole days since the last visit, null on the very first one and 0 for
 * a reload or a visit earlier the same day.
 */
export const visit = {
  count,
  first: saved?.first ?? now,
  daysAway: saved && !same ? Math.floor((now - saved.last) / DAY) : saved ? 0 : null,
}

writeSaved(KEY, { first: visit.first, last: now, count })
