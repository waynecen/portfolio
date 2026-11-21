// The one place that touches localStorage. Each module keeps its own part of a visit under its own
// key, read once when it loads and written when it changes. Storage can be missing or refuse to
// write (private mode, a full disk, blocked cookies): then nothing is kept, and nothing breaks.
// "Start over" (save.ts) forgets everything but the preferences.

/** The saved value for `key`, parsed, or undefined if there's none (or it can't be read). Check its shape before use. */
export function readSaved(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Saves `value` as JSON under `key`, or forgets the key for undefined. */
export function writeSaved(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // not kept: storage is blocked or full
  }
}
