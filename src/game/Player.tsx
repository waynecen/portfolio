import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Mesh } from 'three'
import { bindKeys, keys, stick } from './input'
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
    let x = +keys.right - +keys.left + stick.x
    let z = +keys.back - +keys.forward + stick.z
    const len2 = x * x + z * z
    if (len2 === 0) return
    // Cap at full speed: diagonals don't go faster, a half-pushed stick goes slower.
    if (len2 > 1) {
      const s = 1 / Math.sqrt(len2)
      x *= s
      z *= s
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
