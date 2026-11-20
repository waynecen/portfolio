import { create } from 'zustand'
import type { Interactable } from './interact'

/** A panel over the game: the record player's, or the bag (inventory.ts). */
export type Panel = 'music' | 'inventory'

/** The area the player is in: inside the house, or out on the island. */
export type Scene = 'house' | 'world'

// Low-frequency game state for React UI. Only written when the value changes.
type GameState = {
  /** The interactable the player is close enough to use, if any. */
  focus: Interactable | null
  /** The conversation on screen; the player can't move while it's open. */
  dialogue: { lines: string[]; index: number } | null
  /** A full-screen panel (the record player, or the bag); the player can't move while one is open. */
  panel: Panel | null
  /** Heart containers shown in the HUD. */
  maxHearts: number
  /** Current health in half-heart units (0..maxHearts * 2). */
  health: number
  /** The area being shown. Only one is drawn at a time; see scene.ts. */
  scene: Scene
  /** True while the screen fades through black between areas; the player can't move meanwhile. */
  fading: boolean
  /** Rearranging the furniture indoors (edit.ts); the player can't move meanwhile. */
  editing: boolean
}

export const useGame = create<GameState>(() => ({
  focus: null,
  dialogue: null,
  panel: null,
  maxHearts: 3,
  health: 6,
  scene: 'world',
  fading: false,
  editing: false,
}))
