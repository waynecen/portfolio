import { create } from 'zustand'
import { readSaved, writeSaved } from './persist'

// The dialogue log: every conversation this visit, newest last, so a line that went by too fast
// can be read again (L, or Log in the bag; LogPanel.tsx). Kept for the visit only. Also the
// messages already told once (sayFirst in interact.ts), which are remembered in this browser.

const MAX = 40 // conversations kept; older ones drop off the top

export type Entry = { lines: string[]; at: number }

export const useLog = create<{ entries: Entry[] }>(() => ({ entries: [] }))

/** Adds a conversation to the log. */
export function record(lines: string[]) {
  const entries = useLog.getState().entries
  useLog.setState({ entries: [...entries.slice(-(MAX - 1)), { lines, at: Date.now() }] })
}

const TOLD_KEY = 'told-v1'

function loadTold(): Set<string> {
  const saved: unknown = (readSaved(TOLD_KEY) ?? [])
  return new Set(Array.isArray(saved) ? saved.filter((k): k is string => typeof k === 'string') : [])
}

const told = loadTold()

/** True the first time it's asked about `key` in this browser; false from then on. */
export function firstTime(key: string): boolean {
  if (told.has(key)) return false
  told.add(key)
  writeSaved(TOLD_KEY, [...told])
  return true
}
