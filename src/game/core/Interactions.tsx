import { useFrame } from '@react-three/fiber'
import { closeDialogue, interactables, type Interactable } from './interact'
import { markSeen } from '../portfolio/seen'
import { playerPos } from './state'
import { useGame } from './store'

const LEAVE = 0.6 // a dialogue closes once the player is this much further away than its range

// One proximity scan per frame for every interactable; React only hears about focus changes.
export function Interactions() {
  useFrame(() => {
    const s = useGame.getState()
    // Walking away from a conversation ends it.
    const d = s.dialogue
    if (d) {
      const dx = d.at.x - playerPos.x
      const dz = d.at.z - playerPos.z
      const r = d.at.range + LEAVE
      if (dx * dx + dz * dz > r * r) closeDialogue()
      return // keep the current focus while talking
    }
    if (s.panel || s.editing || s.photo || s.putting) return // keep the current focus in a panel; none while editing, in photo mode or putting
    let nearest: Interactable | null = null
    let best = Infinity
    for (let i = 0; i < interactables.length; i++) {
      const it = interactables[i]
      const dx = it.x - playerPos.x
      const dz = it.z - playerPos.z
      const d = dx * dx + dz * dz
      if (d < it.range * it.range && d < best) {
        best = d
        nearest = it
      }
    }
    if (nearest !== s.focus) {
      useGame.setState({ focus: nearest })
      if (nearest?.seen && nearest.card) markSeen(nearest.seen) // its card is on screen now
    }
  })
  return null
}
