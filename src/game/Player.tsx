import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, type Group } from 'three'
import { actions, bindKeys, keys, stick } from './input'
import { PillCharacter, PILL_RADIUS } from './PillCharacter'
import { playerFacing, playerPos, playerRoll, playerVel } from './state'

export const FLOOR_RADIUS = 8

const SPEED = 4 // walking speed, units per second
const SPRINT = 1.5 // holding Shift multiplies top speed by this (moderate: 4 → 6 units/s)
const ACCEL = 12 // damp rate toward the input velocity while a direction is held
const DECEL = 16 // a little snappier when letting go
const LIMIT = FLOOR_RADIUS - PILL_RADIUS

const ROLL_TIME = 0.45 // seconds for one tumble
const ROLL_SPEED = 9 // burst speed at the start of a roll, eases down toward walk speed
const ROLL_COOLDOWN = 0.2 // seconds after a roll before the next can start

export function Player() {
  const ref = useRef<Group>(null)
  const cooldown = useRef(0)

  useEffect(() => bindKeys(), [])

  useFrame((_, delta) => {
    const root = ref.current
    if (!root) return
    const dt = Math.min(delta, 0.1)
    const v = playerVel
    const roll = playerRoll

    // Start a roll in the direction the character is facing (works from standing still too).
    cooldown.current -= dt
    if (actions.roll) {
      actions.roll = false
      if (roll.p < 0 && cooldown.current <= 0) {
        roll.p = 0
        roll.dirX = Math.sin(playerFacing.heading)
        roll.dirZ = Math.cos(playerFacing.heading)
      }
    }

    let x = +keys.right - +keys.left + stick.x
    let z = +keys.back - +keys.forward + stick.z
    const len2 = x * x + z * z
    // Cap at full speed: diagonals don't go faster, a half-pushed stick goes slower.
    if (len2 > 1) {
      const s = 1 / Math.sqrt(len2)
      x *= s
      z *= s
    }

    if (roll.p >= 0) {
      // Committed burst: input is ignored until the tumble finishes.
      roll.p += dt / ROLL_TIME
      if (roll.p >= 1) {
        roll.p = -1
        cooldown.current = ROLL_COOLDOWN
      } else {
        const burst = ROLL_SPEED * (1 - 0.6 * roll.p)
        v.x = roll.dirX * burst
        v.z = roll.dirZ * burst
      }
    }
    if (roll.p < 0) {
      // Ease velocity toward the input instead of snapping, so starts and stops feel weighty.
      // Sprint eases in and out through the same damp, so pressing Shift ramps up rather than jumps.
      const rate = len2 > 0 ? ACCEL : DECEL
      const top = keys.sprint ? SPEED * SPRINT : SPEED
      v.x = MathUtils.damp(v.x, x * top, rate, dt)
      v.z = MathUtils.damp(v.z, z * top, rate, dt)
      if (len2 === 0 && v.x * v.x + v.z * v.z < 1e-4) v.x = v.z = 0
    }

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

    // Relative to walking speed: 1 = walking, 1.5 = sprinting. Capped so the roll burst doesn't spin the legs.
    v.speed = Math.min(SPRINT, Math.sqrt(v.x * v.x + v.z * v.z) / SPEED)
    playerPos.x = p.x
    playerPos.z = p.z
  })

  return (
    <group ref={ref}>
      <PillCharacter />
    </group>
  )
}
