import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Mesh, MeshLambertMaterial } from 'three'
import { addCollider } from './collision'
import { register } from './interact'
import { projects, stationPos } from './projects'
import { projectPlace, useSeen } from './seen'
import { reducedMotion } from './settings'

const RANGE = 1.5
const BASE_RADIUS = 0.5 // widest part of the pedestal; also its collision radius
const GLOW = '#ffd27a' // an unseen project's gem glows this colour (seen.ts)
const GLOW_MIN = 0.25 // and pulses between these intensities
const GLOW_MAX = 0.8
const PULSE = 2.2 // radians per second

function Station({ index }: { index: number }) {
  const top = useRef<Mesh>(null)
  const gem = useRef<MeshLambertMaterial>(null)
  const { x, z } = stationPos[index]
  const place = projectPlace(projects[index].title)
  const unseen = useSeen((s) => !s.seen.includes(place))

  useEffect(() => {
    const project = projects[index]
    return register({
      x,
      z,
      range: RANGE,
      prompt: 'Open project',
      card: project,
      seen: projectPlace(project.title),
      onInteract: () => {
        if (project.url) window.open(project.url, '_blank', 'noopener')
      },
    })
  }, [index, x, z])

  useEffect(() => addCollider({ kind: 'circle', x, z, r: BASE_RADIUS }), [x, z])

  useFrame(({ clock }, delta) => {
    if (top.current) top.current.rotation.y += delta * 0.8
    // Until it's been seen, the gem glows, pulsing gently (steady with reduced motion).
    if (gem.current && unseen) {
      const k = reducedMotion() ? 1 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * PULSE)
      gem.current.emissiveIntensity = GLOW_MIN + (GLOW_MAX - GLOW_MIN) * k
    }
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.4, BASE_RADIUS, 0.6, 16]} />
        <meshLambertMaterial color="#e8e2d0" />
      </mesh>
      <mesh ref={top} position={[0, 0.95, 0]}>
        <octahedronGeometry args={[0.25]} />
        <meshLambertMaterial
          ref={gem}
          color="#5b7fbf"
          emissive={unseen ? GLOW : '#000000'}
          emissiveIntensity={unseen ? GLOW_MAX : 0}
        />
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
