import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, MeshLambertMaterial, SphereGeometry, type Group, type Mesh } from 'three'
import { playerVel } from './state'

// Procedural walk: everything is driven by playerVel each frame, no clips or bones.
// Local +z is "forward"; at yaw 0 the pill faces the camera.

export const PILL_RADIUS = 0.35
const PILL_LENGTH = 0.4 // straight section between the two hemispheres
const PILL_HALF = PILL_RADIUS + PILL_LENGTH / 2
const BODY_BASE = 0.12 // body bottom sits this high, on top of the feet

// Feel: tweak these to tune the walk.
const STEP_RATE = 5 * Math.PI // phase speed at full speed (2.5 strides/s)
const BOB = 0.08 // hop height per step
const SQUASH = 0.06 // stretch on the way up, squash at footfall
const LEAN = 0.18 // forward tilt in radians at full speed
const TURN = 14 // how quickly the pill turns to face its direction
const STRIDE = 0.14 // how far each foot swings forward/back
const LIFT = 0.12 // how high a foot lifts mid-swing
const BREATHE = 0.015 // idle breathing scale

const FOOT_X = 0.18
const FOOT_Y = 0.07
const FOOT_Z = 0.06

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const MOTION = reduced ? 0.3 : 1

// Shared between the pair, created once with the game chunk.
const eyeGeo = new SphereGeometry(0.055, 12, 8)
const eyeMat = new MeshLambertMaterial({ color: '#2b2b2b' })
const footGeo = new SphereGeometry(0.14, 12, 8)
const footMat = new MeshLambertMaterial({ color: '#d9a536' })

export function PillCharacter() {
  const yaw = useRef<Group>(null)
  const lean = useRef<Group>(null)
  const body = useRef<Group>(null)
  const footL = useRef<Mesh>(null)
  const footR = useRef<Mesh>(null)
  const s = useRef({ w: 0, phase: 0, heading: 0, t: 0 }).current

  useFrame((_, delta) => {
    if (!yaw.current || !lean.current || !body.current || !footL.current || !footR.current) return
    const dt = Math.min(delta, 0.1)
    const v = playerVel
    s.t += dt

    // Walk weight fades the whole cycle in and out; the phase pauses when standing still.
    s.w = MathUtils.damp(s.w, v.speed, 8, dt)
    s.phase += dt * STEP_RATE * v.speed
    const w = s.w

    // Turn toward the direction of travel, the short way round.
    if (v.speed > 0.05) {
      let diff = Math.atan2(v.x, v.z) - s.heading
      diff = ((((diff + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
      s.heading += diff * (1 - Math.exp(-TURN * dt))
    }
    yaw.current.rotation.y = s.heading

    // Footfalls happen where cos(phase) = 0, so the body is lowest there and highest mid-swing.
    const hop = Math.abs(Math.cos(s.phase))
    body.current.position.y = BODY_BASE + hop * BOB * w * MOTION
    const stretch = (hop * 2 - 1) * SQUASH * w * MOTION + Math.sin(s.t * 2) * BREATHE * (1 - w)
    body.current.scale.y = 1 + stretch
    const xz = 1 / Math.sqrt(1 + stretch) // keep volume constant
    body.current.scale.x = xz
    body.current.scale.z = xz

    lean.current.rotation.x = LEAN * w * MOTION

    // Feet are half a cycle apart: one plants and slides back while the other swings forward.
    const l = footL.current.position
    const r = footR.current.position
    l.z = FOOT_Z + Math.sin(s.phase) * STRIDE * w
    l.y = FOOT_Y + Math.max(0, Math.cos(s.phase)) * LIFT * w
    r.z = FOOT_Z - Math.sin(s.phase) * STRIDE * w
    r.y = FOOT_Y + Math.max(0, -Math.cos(s.phase)) * LIFT * w
  })

  return (
    <group ref={yaw}>
      <group ref={lean}>
        {/* Body pivots at its bottom so squash keeps it planted. */}
        <group ref={body} position-y={BODY_BASE}>
          <mesh position-y={PILL_HALF}>
            <capsuleGeometry args={[PILL_RADIUS, PILL_LENGTH, 4, 12]} />
            <meshLambertMaterial color="#f2c14e" />
          </mesh>
          <mesh geometry={eyeGeo} material={eyeMat} position={[-0.12, 0.72, 0.32]} />
          <mesh geometry={eyeGeo} material={eyeMat} position={[0.12, 0.72, 0.32]} />
        </group>
      </group>
      <mesh ref={footL} geometry={footGeo} material={footMat} position={[FOOT_X, FOOT_Y, FOOT_Z]} scale={[1, 0.55, 1.35]} />
      <mesh ref={footR} geometry={footGeo} material={footMat} position={[-FOOT_X, FOOT_Y, FOOT_Z]} scale={[1, 0.55, 1.35]} />
    </group>
  )
}
