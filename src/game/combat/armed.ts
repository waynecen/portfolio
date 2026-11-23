import { create } from 'zustand'
import { readSaved, writeSaved } from '../core/persist'

// Whether the player has the sword yet. It starts in the chest beside the bed (house/Furniture.tsx):
// until that's opened, the sword's keys do nothing (combat.ts). Kept under sword-v1, so Start over
// puts it back in the chest. It lives apart from combat.ts so the house can read it cheaply.

const SAVE_KEY = 'sword-v1'

export const useArmed = create<{ sword: boolean }>(() => ({ sword: readSaved(SAVE_KEY) === true }))

/** Takes the sword out of the chest, for good. */
export function takeSword() {
  useArmed.setState({ sword: true })
  writeSaved(SAVE_KEY, true)
}
