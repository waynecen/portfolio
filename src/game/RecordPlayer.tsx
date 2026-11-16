import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, type Group, type Mesh } from 'three'
import { addCollider } from './collision'
import { openPanel, register } from './interact'
import { level, useMusic } from './music'
import { RECORD_PLAYER } from './layout'

const { x: X, z: Z } = RECORD_PLAYER // in the house; see layout.ts
const RANGE = 1.8
const SPIN = 3.5 // platter speed while playing, rad/s (about 33 rpm)
const PULSE = 0.08 // how much the cabinet bounces to the beat
const W_X = 0.8 // cabinet width
const W_Z = 0.6 // cabinet depth
const W_H = 1.3 // cabinet height, to the top the turntable sits on
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

export function RecordPlayer() {
  const disc = useRef<Mesh>(null)
  const body = useRef<Group>(null)
  const s = useRef({ spin: 0, pulse: 0 }).current

  useEffect(() => register({ x: X, z: Z, range: RANGE, prompt: 'Play music', onInteract: () => openPanel('music') }), [])
  useEffect(() => addCollider({ kind: 'box', x: X, z: Z, hx: W_X / 2 + 0.05, hz: W_Z / 2 + 0.05 }), [])

  useFrame((_, delta) => {
    if (!disc.current || !body.current) return
    const dt = Math.min(delta, 0.1)
    // Platter spins up and winds down instead of snapping on and off.
    s.spin = MathUtils.damp(s.spin, useMusic.getState().playing ? SPIN : 0, 2, dt)
    disc.current.rotation.y += s.spin * dt
    s.pulse = MathUtils.damp(s.pulse, reduced ? 0 : level(), 14, dt)
    body.current.scale.y = 1 + s.pulse * PULSE
  })

  // An upright cabinet, taller than it is wide: a speaker grille on the front and the turntable on top.
  return (
    <group position={[X, 0, Z]}>
      <group ref={body}>
        {/* Cabinet, its top trim and a brass band near the floor */}
        <mesh position-y={W_H / 2}>
          <boxGeometry args={[W_X, W_H, W_Z]} />
          <meshLambertMaterial color="#8a5a3b" />
        </mesh>
        <mesh position-y={W_H + 0.03}>
          <boxGeometry args={[W_X + 0.04, 0.06, W_Z + 0.04]} />
          <meshLambertMaterial color="#6e452c" />
        </mesh>
        <mesh position-y={0.12}>
          <boxGeometry args={[W_X + 0.02, 0.06, W_Z + 0.02]} />
          <meshLambertMaterial color="#d9a441" />
        </mesh>
        {/* Speaker grille, slightly proud of the front */}
        <mesh position={[0, 0.65, W_Z / 2]}>
          <boxGeometry args={[W_X - 0.2, 0.65, 0.03]} />
          <meshLambertMaterial color="#3a2a20" />
        </mesh>
        {/* Record: black disc with an off-centre label so the spin reads */}
        <mesh ref={disc} position={[-0.06, W_H + 0.075, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.03, 32]} />
          <meshLambertMaterial color="#1e1e22" />
          <mesh position-y={0.02}>
            <cylinderGeometry args={[0.09, 0.09, 0.01, 20]} />
            <meshLambertMaterial color="#e2574c" />
          </mesh>
          <mesh position={[0.05, 0.03, 0]}>
            <boxGeometry args={[0.04, 0.01, 0.04]} />
            <meshLambertMaterial color="#fdf5dc" />
          </mesh>
        </mesh>
        {/* Tonearm */}
        <mesh position={[0.26, W_H + 0.12, -0.08]} rotation-y={0.5}>
          <boxGeometry args={[0.04, 0.04, 0.34]} />
          <meshLambertMaterial color="#c9c4b8" />
        </mesh>
        <mesh position={[0.29, W_H + 0.1, -0.2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 12]} />
          <meshLambertMaterial color="#c9c4b8" />
        </mesh>
      </group>
    </group>
  )
}
