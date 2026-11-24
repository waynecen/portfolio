import { useEffect, type RefObject } from 'react'
import { type Group } from 'three'
import { addCollider, type Collider } from '../core/collision'
import { register, type Interactable } from '../core/interact'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'
import { useGame } from '../core/store'
import { INTERIOR } from '../world/layout'
import { useEdit } from './edit'
import { centreOf, PIECE, useRoom, type PieceId } from './room'

// Keeping a piece of furniture where the room says it is (Furniture.tsx, RecordPlayer.tsx), with its
// colliders and its use. Kept apart from the components so their files export only components
// (Vite's fast refresh needs that).

const LIFT = 0.25 // how high a piece floats while it's being moved
const BOB = 0.04 // and how much it bobs

/**
 * Keeps piece `id`'s group where the piece is (or floating in hand while it's being moved), and
 * moves `solid` colliders and the `use` interactable (both relative to its centre) along with it.
 */
export function usePiece(id: PieceId, group: RefObject<Group | null>, solid: Collider[], use?: Omit<Interactable, 'x' | 'z'> & { dx: number; dz: number }) {
  useEffect(() => {
    const p = PIECE[id]
    const world = solid.map((c) => ({ ...c }))
    const item: Interactable | null = use ? { ...use, x: 0, z: 0 } : null
    const follow = () => {
      const at = centreOf(p, useRoom.getState().spots[id])
      world.forEach((c, k) => {
        c.x = at.x + solid[k].x
        c.z = at.z + solid[k].z
      })
      if (item && use) {
        item.x = at.x + use.dx
        item.z = at.z + use.dz
      }
    }
    follow()
    const removers = world.map(addCollider)
    if (item) removers.push(register(item))
    removers.push(useRoom.subscribe(follow))
    return () => removers.forEach((remove) => remove())
  }, [id, solid, use])

  useSceneFrame('house', ({ clock }) => {
    const g = group.current
    if (!g) return
    const h = useEdit.getState().held
    const held = h !== null && h.id === id && useGame.getState().editing
    const at = held ? h.at : useRoom.getState().spots[id]
    const p = PIECE[id]
    g.position.x = INTERIOR.x + at.i + (p.w - 1) / 2 // centreOf(), without making an object each frame
    g.position.z = INTERIOR.z + at.j + (p.d - 1) / 2
    g.position.y = held ? LIFT + (reducedMotion() ? 0 : Math.sin(clock.elapsedTime * 5) * BOB) : 0
  })
}
