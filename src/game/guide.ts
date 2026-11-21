import { busy, say } from './interact'
import { INTERIOR, ROOM } from './layout'
import { PLACES, useSeen } from './seen'
import { whoosh } from './sfx'
import { playerPos } from './state'
import { useGame } from './store'

// "Point me somewhere" (G, or the Where to? chip): shows the way to the nearest place the visitor
// hasn't seen yet (seen.ts). Outdoors the camera glides over to it, holds a moment and glides back
// (CameraRig.tsx), while a few wind streaks drift from the player toward it (GuideWind.tsx). Indoors,
// the streaks point to the door. Walking off ends the look early. Nothing is marked on the map.

export const PEEK = 2 // seconds the camera spends over at the place, gliding there included, before coming back
export const STREAKS_FOR = 1.4 // seconds the wind streaks keep coming

/** Per-frame state, outside React. `t` counts up from 0 while `on`; `peek` moves the camera. */
export const guide = { on: false, peek: false, t: 0, x: 0, z: 0 }

/** G: points the way to the nearest unseen place, or the door from indoors. */
export function pointMe() {
  if (busy()) return
  const indoors = useGame.getState().scene === 'house'
  let target: { x: number; z: number } | null
  if (indoors) target = { x: INTERIOR.x, z: INTERIOR.z + ROOM.hz } // the front door
  else {
    // Projects first: they're what the island is for. Then the About sign and the mailbox.
    const { seen } = useSeen.getState()
    const unseen = PLACES.filter((p) => !seen.includes(p.id))
    target = nearest(unseen.filter((p) => p.kind === 'project')) ?? nearest(unseen)
    if (!target) {
      say(['You’ve seen everything there is to see!', 'The forest to the north-west and the dock to the south-west are there for wandering.'])
      return
    }
  }
  whoosh()
  guide.on = true
  guide.peek = !indoors
  guide.t = 0
  guide.x = target.x
  guide.z = target.z
}

function nearest(places: { x: number; z: number }[]) {
  let best: { x: number; z: number } | null = null
  let bestD = Infinity
  for (const p of places) {
    const d = (p.x - playerPos.x) ** 2 + (p.z - playerPos.z) ** 2
    if (d < bestD) {
      best = p
      bestD = d
    }
  }
  return best
}
