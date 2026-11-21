import { create } from 'zustand'
import { useCave } from './cave'
import { addShells } from '../combat/drops'
import { DOCK } from '../life/fishing'
import { say, sayFirst } from '../core/interact'
import { ISLET } from '../world/Island'
import { ISLET_BOAT, ISLET_SPAWN } from '../world/layout'
import { goTo, type Spawn } from '../core/scene'
import { landed, splash } from '../core/sfx'

// The islet south of the dock (IsletScene.tsx draws it): a rowing boat tied to the dock goes there once
// the player has the oar from the cave (cave.ts), and a second boat on the islet's shore brings them
// back. On the islet: a few trees, an old chest of shells and the last of the pearls (pearls.ts).

/** The boat at the dock: moored along its east side, near the shore end, out of the fishing spots' way. */
export const DOCK_BOAT = { x: DOCK.x + DOCK.half + 0.55, z: 16.7 }
/** Rowing back lands the player on the dock, facing the island (rowing out: ISLET_SPAWN in layout.ts). */
export const DOCK_SPAWN: Spawn = { x: DOCK.x, z: DOCK_BOAT.z, heading: Math.PI }
/** The chest, sign and buried pearl on the islet. */
export const CHEST_AT = { x: ISLET.x + 2, z: ISLET.z + 2 }
export const SIGN_AT = { x: ISLET.x - 1.3, z: ISLET.z - ISLET.r + 0.8 }
export const PEARL_AT = { x: ISLET.x - 2, z: ISLET.z + 1 }
const CHEST_SHELLS = 20

const KEY = 'islet-v1'
function load(): boolean {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as { chest?: unknown }).chest === true
  } catch {
    return false
  }
}
/** Whether the islet's chest has been opened, kept in this browser. */
export const useIslet = create<{ chest: boolean }>(() => ({ chest: load() }))

/** The boat at the dock: rows out with the oar, otherwise it's only something to look at. */
export function rowOut() {
  if (!useCave.getState().oar) {
    say(['A little rowing boat, tied to the dock.', 'It has only one oar. Rowing with one would just go round in circles.'])
    return
  }
  splash()
  goTo('world', ISLET_SPAWN)
}

/** The islet's boat: back to the dock. */
export function rowBack() {
  splash()
  goTo('world', DOCK_SPAWN)
}

export function openChest() {
  if (useIslet.getState().chest) return
  useIslet.setState({ chest: true })
  try {
    localStorage.setItem(KEY, JSON.stringify({ chest: true }))
  } catch {
    // private mode or storage full: kept until the page closes
  }
  addShells(CHEST_SHELLS)
  landed(true)
  say([`An old sea chest, full of shells! You take all ${CHEST_SHELLS}.`])
}

export function readSign() {
  sayFirst(
    'islet-sign',
    ['“Gull Rock. Population: you.”', 'Someone carved this a long time ago. The ground looks dug over in places.'],
    ['“Gull Rock. Population: you.”'],
  )
}
