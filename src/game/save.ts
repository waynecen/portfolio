// What this browser remembers of a visit. Each module keeps its own part in localStorage, under the
// keys below, read once when it loads and written whenever it changes (always inside try/catch, so
// private mode or a full disk only means nothing is kept). This file lists them all, so "Start over"
// in the settings can forget a visit's progress in one go.

/** Progress: what's been found, caught, bought, seen, said and moved. "Start over" forgets these. */
export const PROGRESS_KEYS = [
  'hearts-v1', // store.ts: hearts left
  'shells-v1', // drops.ts
  'inventory-v1', // inventory.ts: the finds in the bag
  'bugs-v1', // bugs.ts
  'fish-v1', // fishing.ts
  'pearls-v1', // pearls.ts
  'cave-v1', // cave.ts: the map, the key, the oar
  'islet-v1', // islet.ts: the sea chest
  'map-v1', // shop.ts: the treasure map
  'hats-v1', // shop.ts
  'decor-v1', // room.ts: furniture bought
  'room-layout-v1', // room.ts: where the furniture stands
  'secrets-v1', // secrets.ts: trinkets found and switched on
  'seen-v1', // seen.ts: projects looked at
  'told-v1', // log.ts: explanations already given in full
  'daily-v1', // daily.ts: today's bottle and dig
  'visits-v1', // visits.ts: when the last visit was
]

/** Preferences, kept by "Start over": the settings (settings.ts) and the music volume (music.ts). */
export const PREFERENCE_KEYS = ['settings-v1', 'portfolio.music.volume']

/** Forgets every bit of progress and reloads, so the island starts fresh. Preferences stay. */
export function startOver() {
  try {
    for (const k of PROGRESS_KEYS) localStorage.removeItem(k)
  } catch {
    // storage blocked: there was nothing kept to forget
  }
  location.reload()
}
