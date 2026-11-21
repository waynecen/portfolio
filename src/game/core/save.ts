// "Start over" in the settings: forget a visit's progress in one go. Each module keeps its own part
// under its own key (persist.ts); everything this site keeps is progress except these preferences,
// so clearing the rest can't miss a key, even one from a module that hasn't loaded yet.

/** Kept by "Start over": the settings (settings.ts), the music volume (music.ts) and the keys (keymap.ts). */
const PREFERENCE_KEYS = ['settings-v1', 'portfolio.music.volume', 'keys-v1']

/** Forgets every bit of progress and reloads, so the island starts fresh. Preferences stay. */
export function startOver() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    for (const k of keys) if (k && !PREFERENCE_KEYS.includes(k)) localStorage.removeItem(k)
  } catch {
    // storage blocked: there was nothing kept to forget
  }
  location.reload()
}
