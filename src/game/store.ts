import { create } from 'zustand'

// Low-frequency game state for React UI. Only written when the value changes.
type GameState = {
  active: number | null
  /** Heart containers shown in the HUD. */
  maxHearts: number
  /** Current health in half-heart units (0..maxHearts * 2). */
  health: number
}

export const useGame = create<GameState>(() => ({ active: null, maxHearts: 3, health: 6 }))
