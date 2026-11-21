import { useEffect, useRef, useState } from 'react'
import { Color, type Group } from 'three'
import { bottleAt, bottleWaiting, dig, digAt, digWaiting, readBottle } from './daily'
import { burst } from '../player/Dust'
import { register } from '../core/interact'
import { reducedMotion } from '../core/settings'
import { useTreasureMap } from './shop'
import { useSceneFrame } from '../core/sceneFrame'

// Today's message bottle on the shore and dig spot in the grass (daily.ts). Each goes once used.

const DIRT = new Color('#8a6a48')

function Bottle() {
  const [here, setHere] = useState(bottleWaiting)
  const group = useRef<Group>(null)
  const { x, z } = bottleAt
  useEffect(() => {
    if (!here) return
    return register({
      x,
      z,
      range: 1.2,
      prompt: 'Read',
      onInteract: () => {
        readBottle()
        setHere(false)
      },
    })
  }, [here, x, z])
  // Rocking gently, as if the tide just left it.
  useSceneFrame('world', ({ clock }) => {
    if (group.current && !reducedMotion()) group.current.rotation.z = Math.sin(clock.elapsedTime * 1.4) * 0.08
  })
  if (!here) return null
  return (
    <group position={[x, 0.07, z]} rotation-y={0.8}>
      <group ref={group}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.07, 0.07, 0.26, 8]} />
          <meshLambertMaterial color="#7fbfa4" transparent opacity={0.85} />
        </mesh>
        <mesh rotation-z={Math.PI / 2} position-x={0.17}>
          <cylinderGeometry args={[0.03, 0.04, 0.09, 6]} />
          <meshLambertMaterial color="#7fbfa4" transparent opacity={0.85} />
        </mesh>
        <mesh rotation-z={Math.PI / 2} position-x={0.23}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 6]} />
          <meshLambertMaterial color="#b08a5a" />
        </mesh>
        {/* the rolled-up note inside */}
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 6]} />
          <meshLambertMaterial color="#f4efe2" />
        </mesh>
      </group>
    </group>
  )
}

function DigSpot() {
  const [here, setHere] = useState(digWaiting)
  const marked = useTreasureMap((s) => s.owned) // the treasure map marks it in red
  const { x, z } = digAt
  useEffect(() => {
    if (!here) return
    return register({
      x,
      z,
      range: 1,
      prompt: 'Dig',
      onInteract: () => {
        dig()
        burst(x, z, 8, DIRT)
        setHere(false)
      },
    })
  }, [here, x, z])
  if (!here) return null
  // A small cross of disturbed earth, the way a buried thing gives itself away.
  return (
    <group position={[x, 0.012, z]}>
      {[0.6, -0.6].map((a) => (
        <mesh key={a} rotation={[-Math.PI / 2, 0, a]}>
          <planeGeometry args={[0.5, 0.09]} />
          <meshLambertMaterial color={marked ? '#c4453b' : '#6b5238'} />
        </mesh>
      ))}
    </group>
  )
}

export function DailyFinds() {
  return (
    <>
      <Bottle />
      <DigSpot />
    </>
  )
}
