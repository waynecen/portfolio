import { useEffect } from 'react'
import { addCollider } from './collision'
import { register, say } from './interact'

const WOOD = '#a0724a'

/** A readable wooden sign. `lines` are shown one per press in the dialogue box. */
export function Sign({ x, z, lines }: { x: number; z: number; lines: string[] }) {
  useEffect(() => register({ x, z, range: 1.4, prompt: 'Read', onInteract: () => say(lines) }), [x, z, lines])
  // A little deeper than the board, so the pill bumps the sign rather than clipping its post.
  useEffect(() => addCollider({ kind: 'box', x, z, hx: 0.45, hz: 0.1 }), [x, z])
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.35}>
        <boxGeometry args={[0.1, 0.7, 0.1]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      <mesh position-y={0.8}>
        <boxGeometry args={[0.9, 0.5, 0.08]} />
        <meshLambertMaterial color="#c99a68" />
      </mesh>
    </group>
  )
}
