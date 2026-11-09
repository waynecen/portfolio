import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Mesh } from 'three'
import { bindKeys, keys } from './input'
import { playerPos } from './state'

export const FLOOR_RADIUS = 8

const SPEED = 4 // units per second
const RADIUS = 0.35
const LIMIT = FLOOR_RADIUS - RADIUS

export function Player() {
  const ref = useRef<Mesh>(null)

  useEffect(() => bindKeys(), [])

  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh) return
    let x = +keys.right - +keys.left
    let z = +keys.back - +keys.forward
    if (x === 0 && z === 0) return
    if (x !== 0 && z !== 0) {
      x *= Math.SQRT1_2
      z *= Math.SQRT1_2
    }
    const step = SPEED * Math.min(delta, 0.1)
    const p = mesh.position
    p.x += x * step
    p.z += z * step
    const d2 = p.x * p.x + p.z * p.z
    if (d2 > LIMIT * LIMIT) {
      const s = LIMIT / Math.sqrt(d2)
      p.x *= s
      p.z *= s
    }
    playerPos.x = p.x
    playerPos.z = p.z
  })

  return (
    <mesh ref={ref} position={[0, 0.5, 0]}>
      <capsuleGeometry args={[RADIUS, 0.4, 4, 8]} />
      <meshLambertMaterial color="#f2c14e" />
    </mesh>
  )
}
