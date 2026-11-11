import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Mesh } from 'three'
import { register } from './interact'
import { projects, stationPos } from './projects'

const RANGE = 1.5

function Station({ index }: { index: number }) {
  const top = useRef<Mesh>(null)
  const { x, z } = stationPos[index]

  useEffect(() => {
    const project = projects[index]
    return register({
      x,
      z,
      range: RANGE,
      prompt: 'Open project',
      card: project,
      onInteract: () => {
        if (project.url) window.open(project.url, '_blank', 'noopener')
      },
    })
  }, [index, x, z])

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
  return (
    <>
      {stationPos.map((_, i) => (
        <Station key={i} index={i} />
      ))}
    </>
  )
}
