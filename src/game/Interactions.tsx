import { useFrame } from '@react-three/fiber'
import { interactables, type Interactable } from './interact'
import { playerPos } from './state'
import { useGame } from './store'

// One proximity scan per frame for every interactable; React only hears about focus changes.
export function Interactions() {
  useFrame(() => {
    const s = useGame.getState()
    if (s.dialogue || s.panel) return // keep the current focus while talking or in a panel
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
    if (nearest !== s.focus) useGame.setState({ focus: nearest })
  })
  return null
}
