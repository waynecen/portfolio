import { create } from 'zustand'
import { readSaved, writeSaved } from './persist'

// The visitor's settings (SettingsPanel.tsx), kept in this browser: the effects volume (music has
// its own, music.ts), how much things move, larger text, and the fishing assist. Every assist is
// optional, can be changed any time, and shows while it's on.

export type Motion = 'device' | 'reduce' | 'full'

type Settings = {
  /** Sound effects volume, 0..1, apart from the music. */
  effects: number
  /** Reduced motion: follow the device's setting, or always reduce, or never. */
  motion: Motion
  /** Larger text in the dialogue, prompts, cards and panels. */
  bigText: boolean
  /** A longer window to reel in a bite (fishing.ts), marked on the prompt while it's on. */
  fishAssist: boolean
  /** Gentle greens (golf.ts): a longer aim line and more friction near the cup, marked on the scorecard. */
  golfAssist: boolean
  /** Slimes in the meadows (Slimes.tsx); off for a visit with nothing to fight. */
  slimes: boolean
}

const KEY = 'settings-v1'
const DEFAULTS: Settings = { effects: 1, motion: 'device', bigText: false, fishAssist: false, golfAssist: false, slimes: true }

function load(): Settings {
  const saved = (readSaved(KEY) ?? {}) as Partial<Settings>
  return {
    effects: typeof saved.effects === 'number' && saved.effects >= 0 && saved.effects <= 1 ? saved.effects : DEFAULTS.effects,
    motion: saved.motion === 'reduce' || saved.motion === 'full' ? saved.motion : DEFAULTS.motion,
    bigText: saved.bigText === true,
    fishAssist: saved.fishAssist === true,
    golfAssist: saved.golfAssist === true,
    slimes: saved.slimes !== false,
  }
}

export const useSettings = create<Settings>(() => load())

/** Changes one setting and remembers it. */
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  useSettings.setState({ [key]: value } as Pick<Settings, K>)
  writeSaved(KEY, useSettings.getState())
}

const deviceReduces = matchMedia('(prefers-reduced-motion: reduce)')

/** True if things should move less: the visitor's choice, or the device's when they've left it. Cheap enough to call every frame. */
export function reducedMotion(): boolean {
  const m = useSettings.getState().motion
  return m === 'reduce' || (m === 'device' && deviceReduces.matches)
}

// Mirror the motion and text choices on <body>, for the CSS (style.css).
function mirror() {
  document.body.classList.toggle('reduce-motion', reducedMotion())
  document.body.classList.toggle('big-text', useSettings.getState().bigText)
}
mirror()
useSettings.subscribe(mirror)
deviceReduces.addEventListener('change', mirror)
