import { create } from 'zustand'

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
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(TOLD_KEY) ?? '[]')
    return new Set(Array.isArray(saved) ? saved.filter((k): k is string => typeof k === 'string') : [])
  } catch {
    return new Set()
  }
}

const told = loadTold()

/** True the first time it's asked about `key` in this browser; false from then on. */
export function firstTime(key: string): boolean {
  if (told.has(key)) return false
  told.add(key)
  try {
    localStorage.setItem(TOLD_KEY, JSON.stringify([...told]))
  } catch {
    // private mode or storage full: told again next visit
  }
  return true
}
