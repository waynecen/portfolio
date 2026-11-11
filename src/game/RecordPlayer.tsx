import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, type Group, type Mesh } from 'three'
import { addCollider } from './collision'
import { openPanel, register } from './interact'
import { level, useMusic } from './music'

// About one screen-width to the right of spawn.
const X = 19
const Z = 0
const RANGE = 1.8
const SPIN = 3.5 // platter speed while playing, rad/s (about 33 rpm)
const PULSE = 0.08 // how much the cabinet bounces to the beat
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

export function RecordPlayer() {
  const disc = useRef<Mesh>(null)
  const body = useRef<Group>(null)
  const s = useRef({ spin: 0, pulse: 0 }).current

  useEffect(() => register({ x: X, z: Z, range: RANGE, prompt: 'Play music', onInteract: () => openPanel('music') }), [])
  useEffect(() => addCollider({ kind: 'box', x: X, z: Z, hx: 0.65, hz: 0.5 }), [])

  useFrame((_, delta) => {
    if (!disc.current || !body.current) return
    const dt = Math.min(delta, 0.1)
    // Platter spins up and winds down instead of snapping on and off.
    s.spin = MathUtils.damp(s.spin, useMusic.getState().playing ? SPIN : 0, 2, dt)
    disc.current.rotation.y += s.spin * dt
    s.pulse = MathUtils.damp(s.pulse, reduced ? 0 : level(), 14, dt)
    body.current.scale.y = 1 + s.pulse * PULSE
  })

  return (
    <group position={[X, 0, Z]}>
      <group ref={body}>
        {/* Cabinet */}
        <mesh position-y={0.3}>
          <boxGeometry args={[1.2, 0.6, 0.9]} />
          <meshLambertMaterial color="#8a5a3b" />
        </mesh>
        <mesh position-y={0.62}>
          <boxGeometry args={[1.24, 0.06, 0.94]} />
          <meshLambertMaterial color="#6e452c" />
        </mesh>
        {/* Record: black disc with an off-centre label so the spin reads */}
        <mesh ref={disc} position={[-0.12, 0.67, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.03, 32]} />
          <meshLambertMaterial color="#1e1e22" />
          <mesh position-y={0.02}>
            <cylinderGeometry args={[0.13, 0.13, 0.01, 20]} />
            <meshLambertMaterial color="#e2574c" />
          </mesh>
          <mesh position={[0.07, 0.03, 0]}>
            <boxGeometry args={[0.05, 0.01, 0.05]} />
            <meshLambertMaterial color="#fdf5dc" />
          </mesh>
        </mesh>
        {/* Tonearm */}
        <mesh position={[0.38, 0.72, -0.15]} rotation-y={0.5}>
          <boxGeometry args={[0.05, 0.05, 0.5]} />
          <meshLambertMaterial color="#c9c4b8" />
        </mesh>
        <mesh position={[0.42, 0.7, -0.32]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
          <meshLambertMaterial color="#c9c4b8" />
        </mesh>
      </group>
    </group>
  )
}
