import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, MeshLambertMaterial, SphereGeometry, type Group, type Mesh } from 'three'
import { playerFacing, playerRoll, playerVel } from './state'

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
const SPRINT_LEAN = 0.6 // extra forward lean at full sprint (+60%, about 16° total)
const SPRINT_STRIDE = 0.3 // longer foot swing at full sprint (+30%)
const TUCK = 0.22 // how much the body squashes into a ball mid-roll
const ROLL_DROP = 0.28 // how far the body's centre drops mid-roll so it tumbles along the floor

const CENTER = BODY_BASE + PILL_HALF // tumble pivot: the middle of the body

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
  const tumble = useRef<Group>(null)
  const body = useRef<Group>(null)
  const footL = useRef<Mesh>(null)
  const footR = useRef<Mesh>(null)
  const s = useRef({ w: 0, phase: 0, heading: 0, t: 0 }).current

  useFrame((_, delta) => {
    if (!yaw.current || !lean.current || !tumble.current || !body.current || !footL.current || !footR.current) return
    const dt = Math.min(delta, 0.1)
    const v = playerVel
    s.t += dt

    // Roll envelope: 0 at the start and end of a roll, 1 in the middle. The walk fades out under it.
    const p = playerRoll.p
    const env = p >= 0 ? Math.sin(Math.PI * p) : 0

    // Walk weight fades the whole cycle in and out; the phase pauses when standing still.
    // Cadence follows speed, so sprinting (speed above 1) steps faster.
    s.w = MathUtils.damp(s.w, Math.min(1, v.speed), 8, dt)
    s.phase += dt * STEP_RATE * v.speed
    const w = s.w * (1 - env)
    // 0 when walking, 1 at full sprint (speed 1.5): drives the extra lean and longer stride.
    const sprint = Math.min(1, Math.max(0, (v.speed - 1) * 2)) * (1 - env)

    // Turn toward the direction of travel, the short way round.
    if (v.speed > 0.05) {
      let diff = Math.atan2(v.x, v.z) - s.heading
      diff = ((((diff + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
      s.heading += diff * (1 - Math.exp(-TURN * dt))
    }
    yaw.current.rotation.y = s.heading
    playerFacing.heading = s.heading

    // Tumble: one full forward flip around the body's centre, eased in and out,
    // dropping low mid-roll so the pill turns over along the floor.
    const flip = p >= 0 ? p * p * (3 - 2 * p) : 0
    tumble.current.rotation.x = flip * Math.PI * 2
    tumble.current.position.y = CENTER - env * ROLL_DROP

    // Footfalls happen where cos(phase) = 0, so the body is lowest there and highest mid-swing.
    const hop = Math.abs(Math.cos(s.phase))
    body.current.position.y = -PILL_HALF + hop * BOB * w * MOTION
    const idle = (1 - s.w) * (1 - env)
    const stretch = (hop * 2 - 1) * SQUASH * w * MOTION + Math.sin(s.t * 2) * BREATHE * idle - TUCK * env
    body.current.scale.y = 1 + stretch
    const xz = 1 / Math.sqrt(1 + stretch) // keep volume constant
    body.current.scale.x = xz
    body.current.scale.z = xz

    lean.current.rotation.x = LEAN * w * MOTION * (1 + SPRINT_LEAN * sprint)

    // Feet are half a cycle apart: one plants and slides back while the other swings forward.
    const l = footL.current.position
    const r = footR.current.position
    const stride = STRIDE * w * (1 + SPRINT_STRIDE * sprint)
    l.z = FOOT_Z + Math.sin(s.phase) * stride
    l.y = FOOT_Y + Math.max(0, Math.cos(s.phase)) * LIFT * w
    r.z = FOOT_Z - Math.sin(s.phase) * stride
    r.y = FOOT_Y + Math.max(0, -Math.cos(s.phase)) * LIFT * w

    // Tuck the feet away quickly as the roll starts, and pop them back out at the end.
    const feet = Math.max(0.001, 1 - Math.min(1, env * 2))
    footL.current.scale.set(feet, 0.55 * feet, 1.35 * feet)
    footR.current.scale.set(feet, 0.55 * feet, 1.35 * feet)
  })

  return (
    <group ref={yaw}>
      <group ref={lean}>
        {/* Tumble pivots at the body's centre; the body inside pivots at its bottom so squash keeps it planted. */}
        <group ref={tumble} position-y={CENTER}>
          <group ref={body} position-y={-PILL_HALF}>
            <mesh position-y={PILL_HALF}>
              <capsuleGeometry args={[PILL_RADIUS, PILL_LENGTH, 4, 12]} />
              <meshLambertMaterial color="#f2c14e" />
            </mesh>
            <mesh geometry={eyeGeo} material={eyeMat} position={[-0.12, 0.72, 0.32]} />
            <mesh geometry={eyeGeo} material={eyeMat} position={[0.12, 0.72, 0.32]} />
          </group>
        </group>
      </group>
      <mesh ref={footL} geometry={footGeo} material={footMat} position={[FOOT_X, FOOT_Y, FOOT_Z]} scale={[1, 0.55, 1.35]} />
      <mesh ref={footR} geometry={footGeo} material={footMat} position={[-FOOT_X, FOOT_Y, FOOT_Z]} scale={[1, 0.55, 1.35]} />
    </group>
  )
}
