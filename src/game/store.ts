import { create } from 'zustand'
import type { Interactable } from './interact'

// Low-frequency game state for React UI. Only written when the value changes.
type GameState = {
  /** The interactable the player is close enough to use, if any. */
  focus: Interactable | null
  /** The conversation on screen; the player can't move while it's open. */
  dialogue: { lines: string[]; index: number } | null
  /** A full-screen panel (e.g. the record player); the player can't move while one is open. */
  panel: 'music' | null
  /** Heart containers shown in the HUD. */
  maxHearts: number
  /** Current health in half-heart units (0..maxHearts * 2). */
  health: number
}

export const useGame = create<GameState>(() => ({ focus: null, dialogue: null, panel: null, maxHearts: 3, health: 6 }))
