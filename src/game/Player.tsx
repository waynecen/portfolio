import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, type Group } from 'three'
import { bindKeys, keys, stick } from './input'
import { PillCharacter, PILL_RADIUS } from './PillCharacter'
import { playerPos, playerVel } from './state'

export const FLOOR_RADIUS = 8

const SPEED = 4 // units per second
const ACCEL = 12 // damp rate toward the input velocity while a direction is held
const DECEL = 16 // a little snappier when letting go
const LIMIT = FLOOR_RADIUS - PILL_RADIUS

export function Player() {
  const ref = useRef<Group>(null)

  useEffect(() => bindKeys(), [])

  useFrame((_, delta) => {
    const root = ref.current
    if (!root) return
    const dt = Math.min(delta, 0.1)

    let x = +keys.right - +keys.left + stick.x
    let z = +keys.back - +keys.forward + stick.z
    const len2 = x * x + z * z
    // Cap at full speed: diagonals don't go faster, a half-pushed stick goes slower.
    if (len2 > 1) {
      const s = 1 / Math.sqrt(len2)
      x *= s
      z *= s
    }

    // Ease velocity toward the input instead of snapping, so starts and stops feel weighty.
    const v = playerVel
    const rate = len2 > 0 ? ACCEL : DECEL
    v.x = MathUtils.damp(v.x, x * SPEED, rate, dt)
    v.z = MathUtils.damp(v.z, z * SPEED, rate, dt)
    if (len2 === 0 && v.x * v.x + v.z * v.z < 1e-4) v.x = v.z = 0

    const p = root.position
    p.x += v.x * dt
    p.z += v.z * dt

    // Keep the pill on the floor, and drop the outward part of its velocity so it slides along the edge.
    const d2 = p.x * p.x + p.z * p.z
    if (d2 > LIMIT * LIMIT) {
      const d = Math.sqrt(d2)
      const nx = p.x / d
      const nz = p.z / d
      p.x = nx * LIMIT
      p.z = nz * LIMIT
      const out = v.x * nx + v.z * nz
      if (out > 0) {
        v.x -= out * nx
        v.z -= out * nz
      }
    }

    v.speed = Math.min(1, Math.sqrt(v.x * v.x + v.z * v.z) / SPEED)
    playerPos.x = p.x
    playerPos.z = p.z
  })

  return (
    <group ref={ref}>
      <PillCharacter />
    </group>
  )
}
