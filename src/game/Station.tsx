import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { stationPos } from './projects'
import { playerPos } from './state'
import { useGame } from './store'

const RANGE = 1.5

function Station({ x, z }: { x: number; z: number }) {
  const top = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (top.current) top.current.rotation.y += delta * 0.8
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.6, 16]} />
        <meshLambertMaterial color="#e8e2d0" />
      </mesh>
      <mesh ref={top} position={[0, 0.95, 0]}>
        <octahedronGeometry args={[0.25]} />
        <meshLambertMaterial color="#5b7fbf" />
      </mesh>
    </group>
  )
}

export function Stations() {
  const last = useRef<number | null>(null)

  // One proximity check per frame; React only hears about enter/leave.
  useFrame(() => {
    let nearest: number | null = null
    let best = RANGE * RANGE
    for (let i = 0; i < stationPos.length; i++) {
      const dx = stationPos[i].x - playerPos.x
      const dz = stationPos[i].z - playerPos.z
      const d = dx * dx + dz * dz
      if (d < best) {
        best = d
        nearest = i
      }
    }
    if (nearest !== last.current) {
      last.current = nearest
      useGame.setState({ active: nearest })
    }
  })

  return (
    <>
      {stationPos.map((p, i) => (
        <Station key={i} x={p.x} z={p.z} />
      ))}
    </>
  )
}
