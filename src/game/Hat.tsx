import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Group } from 'three'
import { PLAYER_HEIGHT } from './models'
import { HATS, useHats, type HatId } from './shop'
import { playerFacing, playerRoll } from './core/state'

// The hat the player is wearing, if any (bought at Pip's shop, shop.ts), sat on top of the head.
// Mounted in <Player>'s root like the rod and sword: it turns with the character and hides during
// a roll's tumble rather than flying off.

const TOP = PLAYER_HEIGHT - 0.1 // where the hat sits, just into the hair

function Shape({ id, color }: { id: HatId; color: string }) {
  switch (id) {
    case 'straw':
      return (
        <>
          <mesh position-y={0.015}>
            <cylinderGeometry args={[0.27, 0.27, 0.03, 16]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position-y={0.09}>
            <cylinderGeometry args={[0.13, 0.15, 0.13, 14]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position-y={0.05}>
            <cylinderGeometry args={[0.152, 0.152, 0.04, 14]} />
            <meshLambertMaterial color="#c4453b" />
          </mesh>
        </>
      )
    case 'party':
      return (
        <>
          <mesh position-y={0.16}>
            <coneGeometry args={[0.12, 0.32, 12]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position-y={0.34}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshLambertMaterial color="#f2b233" />
          </mesh>
        </>
      )
    case 'beanie':
      return (
        <>
          <mesh position-y={0.02}>
            <sphereGeometry args={[0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position-y={0.02}>
            <cylinderGeometry args={[0.175, 0.175, 0.05, 14]} />
            <meshLambertMaterial color="#e8e2d0" />
          </mesh>
          <mesh position-y={0.2}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshLambertMaterial color="#e8e2d0" />
          </mesh>
        </>
      )
    case 'crown':
      return (
        <>
          <mesh position-y={0.05}>
            <cylinderGeometry args={[0.13, 0.12, 0.1, 10, 1, true]} />
            <meshLambertMaterial color={color} side={2} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => {
            const a = (k / 5) * Math.PI * 2
            return (
              <mesh key={k} position={[Math.cos(a) * 0.12, 0.14, Math.sin(a) * 0.12]}>
                <coneGeometry args={[0.03, 0.08, 4]} />
                <meshLambertMaterial color={color} />
              </mesh>
            )
          })}
        </>
      )
  }
}

export function Hat() {
  const worn = useHats((s) => s.worn)
  const group = useRef<Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = playerRoll.p < 0
    g.rotation.y = playerFacing.heading
  })
  if (!worn) return null
  const hatColor = HATS.find((h) => h.id === worn)!.color
  return (
    <group ref={group}>
      <group position-y={TOP} rotation-x={-0.12}>
        <Shape id={worn} color={hatColor} />
      </group>
    </group>
  )
}
