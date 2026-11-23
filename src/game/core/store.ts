import { create } from 'zustand'
import type { Interactable } from './interact'
import { readSaved, writeSaved } from './persist'

/** A panel over the game: the record player's, the bag (inventory.ts), the dialogue log (log.ts), the settings (settings.ts), the touch screen's menu (MenuPanel.tsx), the shop, or the golf round's card (golf/RoundPanel.tsx). */
export type Panel = 'music' | 'inventory' | 'log' | 'settings' | 'menu' | 'shop' | 'golf'

/** The area the player is in: inside the house, out on the island, or in the cave behind the waterfall. */
export type Scene = 'house' | 'world' | 'cave'

// Low-frequency game state for React UI. Only written when the value changes.
type GameState = {
  /** The interactable the player is close enough to use, if any. */
  focus: Interactable | null
  /**
   * The conversation on screen. The player can keep walking; going further than `at.range` (plus a
   * little) from where it started closes it (Interactions.tsx).
   */
  dialogue: { lines: string[]; index: number; at: { x: number; z: number; range: number } } | null
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
  /** Photo mode (photo.ts): the HUD steps aside and the camera is the visitor's; the player holds still. */
  photo: boolean
  /** Standing at the golf ball, aiming a putt (golf/golf.ts): the player holds still. */
  putting: boolean
}

const MAX_HEARTS = 3
const HEARTS_KEY = 'hearts-v1' // save.ts

// Hearts left are kept between visits (an empty count wakes in bed with all of them anyway, health.ts).
function loadHealth(): number {
  const n = readSaved(HEARTS_KEY)
  return typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= MAX_HEARTS * 2 ? n : MAX_HEARTS * 2
}

export const useGame = create<GameState>(() => ({
  focus: null,
  dialogue: null,
  panel: null,
  maxHearts: MAX_HEARTS,
  health: loadHealth(),
  scene: 'world',
  fading: false,
  editing: false,
  photo: false,
  putting: false,
}))

useGame.subscribe((s, prev) => {
  if (s.health === prev.health) return
  // Zero is only for a faint, which wakes with every heart back (health.ts), so that's what's kept.
  writeSaved(HEARTS_KEY, s.health || MAX_HEARTS * 2)
})
