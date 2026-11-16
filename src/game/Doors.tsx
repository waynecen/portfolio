import { useFrame } from '@react-three/fiber'
import { DOOR, FRONT_DOOR, INSIDE_SPAWN, INTERIOR, OUTSIDE_SPAWN, ROOM } from './layout'
import { PILL_RADIUS } from './PillCharacter'
import { goTo } from './scene'
import { playerPos, teleport } from './state'
import { useGame } from './store'

// Walk-through doors between the house and the island. Each frame, if the player has stepped into
// the current area's doorway, fade to the other area. Both arrival spots sit well clear of the
// doorways, so arriving never sends you straight back.

const WAY_OUT = ROOM.hz + 0.25 // indoors: past this far down the room (house-local z), you're out the door
const PRESS = PILL_RADIUS + 0.1 // outdoors: this close to the front wall in the doorway, you're in

export function Doors() {
  useFrame(() => {
    const s = useGame.getState()
    if (s.fading || teleport.pending) return // the player hasn't arrived yet; playerPos is stale
    if (s.scene === 'house') {
      const dz = playerPos.z - INTERIOR.z
      if (Math.abs(playerPos.x - INTERIOR.x) < DOOR && dz > WAY_OUT && dz < ROOM.hz + 1) goTo('world', OUTSIDE_SPAWN)
    } else {
      const dz = playerPos.z - FRONT_DOOR.z
      if (Math.abs(playerPos.x - FRONT_DOOR.x) < DOOR - 0.05 && dz > 0 && dz < PRESS) goTo('house', INSIDE_SPAWN)
    }
  })
  return null
}
