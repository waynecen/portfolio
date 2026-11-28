import { track } from '../../analytics'
import { lazy, Suspense, useEffect } from 'react'
import { addCollider } from '../core/collision'
import { register } from '../core/interact'
import { CONTACT_AT, contactCard } from './places'

// The Contact place: a mailbox. Walking up shows the contact card with every link; using it opens
// the first one (email).

const RANGE = 1.4
const RADIUS = 0.25 // collision radius, a little wider than the box

// The Tripo model (models-src/mailbox.glb, through npm run models): narrower than its own shape (it'd be
// 0.82 tall at this width) and a little lower than the blocks it replaced (1.2):
// the blocks below stand in while it downloads.
const Model = lazy(() => import('../house/PropModel'))
const MODEL = { url: '/models/mailbox.glb', width: 0.55, height: 0.95 }

export function Mailbox() {
  const { x, z } = CONTACT_AT

  useEffect(
    () =>
      register({
        x,
        z,
        range: RANGE,
        prompt: 'Write',
        card: contactCard,
        seen: 'contact',
        onInteract: () => {
          if (!contactCard.url) return
          window.open(contactCard.url, '_blank', 'noopener')
          track('Link opened', { href: contactCard.url, from: 'game' })
        },
      }),
    [x, z],
  )
  useEffect(() => addCollider({ kind: 'circle', x, z, r: RADIUS }), [x, z])

  const blocks = (
    <>
      {/* post */}
      <mesh position-y={0.4}>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshLambertMaterial color="#a0724a" />
      </mesh>
      {/* box, with a rounded lid along its length (front to back) */}
      <mesh position-y={0.92}>
        <boxGeometry args={[0.34, 0.24, 0.5]} />
        <meshLambertMaterial color="#4a74b8" />
      </mesh>
      <mesh position-y={1.04} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.17, 0.17, 0.5, 12, 1, false, -Math.PI / 2, Math.PI]} />
        <meshLambertMaterial color="#4a74b8" />
      </mesh>
      {/* the door, facing the camera */}
      <mesh position={[0, 0.96, 0.252]}>
        <boxGeometry args={[0.26, 0.26, 0.01]} />
        <meshLambertMaterial color="#3b5f99" />
      </mesh>
      {/* flag, raised */}
      <mesh position={[0.19, 1.08, -0.05]}>
        <boxGeometry args={[0.03, 0.3, 0.05]} />
        <meshLambertMaterial color="#d9473b" />
      </mesh>
      <mesh position={[0.19, 1.2, 0.04]}>
        <boxGeometry args={[0.03, 0.1, 0.14]} />
        <meshLambertMaterial color="#d9473b" />
      </mesh>
    </>
  )
  return (
    <group position={[x, 0, z]}>
      <Suspense fallback={blocks}>
        <Model {...MODEL} scene="world" />
      </Suspense>
    </group>
  )
}
