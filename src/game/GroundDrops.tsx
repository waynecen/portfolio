import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { ConeGeometry, MeshLambertMaterial, OctahedronGeometry, type Group } from 'three'
import { DROP_LIFE, drops, updateDrops, useShells } from './drops'
import { reducedMotion } from './core/settings'
import { playerPos } from './core/state'
import { useGame } from './core/store'

// The drops on the ground (drops.ts): shells and hearts, bobbing and turning, blinking in their
// last few seconds. One small group per slot of the pool, shown only while the slot is in use.
// Also the shell counter, which shows at the top for a moment whenever shells are picked up.

const BLINK = 4 // seconds before a drop vanishes that it starts blinking
const shellGeometry = new ConeGeometry(0.1, 0.18, 8).rotateZ(Math.PI / 2.4)
const shellMaterial = new MeshLambertMaterial({ color: '#f2b8b0', emissive: '#f2b8b0', emissiveIntensity: 0.25, flatShading: true })
const heartGeometry = new OctahedronGeometry(0.11, 0).scale(1, 0.9, 0.55)
const heartMaterial = new MeshLambertMaterial({ color: '#e2262b', emissive: '#e2262b', emissiveIntensity: 0.35, flatShading: true })

export function GroundDrops() {
  const slots = useRef<(Group | null)[]>([])

  useFrame(({ clock }, delta) => {
    if (useGame.getState().scene === 'world') updateDrops(Math.min(delta, 0.1), playerPos.x, playerPos.z)
    const t = clock.elapsedTime
    for (let i = 0; i < drops.length; i++) {
      const g = slots.current[i]
      if (!g) continue
      const d = drops[i]
      const left = DROP_LIFE - d.age
      g.visible = !!d.kind && (left > BLINK || Math.floor(left * 8) % 2 === 0)
      if (!d.kind) continue
      g.position.set(d.x, 0.22 + (reducedMotion() ? 0 : Math.sin(t * 3 + i) * 0.05), d.z)
      g.rotation.y = reducedMotion() ? 0 : t * 2 + i
      g.children[0].visible = d.kind === 'shell'
      g.children[1].visible = d.kind === 'heart'
    }
  })

  return (
    <>
      {drops.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            slots.current[i] = el
          }}
          visible={false}
        >
          <mesh geometry={shellGeometry} material={shellMaterial} />
          <mesh geometry={heartGeometry} material={heartMaterial} />
        </group>
      ))}
    </>
  )
}

const SHOW_FOR = 2500 // ms the shell counter stays after a pickup

/** The shell counter: top centre, for a moment after shells are picked up. */
export function ShellCounter() {
  const { shells, at } = useShells()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!at) return
    setShown(true)
    const timer = setTimeout(() => setShown(false), SHOW_FOR)
    return () => clearTimeout(timer)
  }, [at])
  if (!shown) return null
  return (
    <div className="shell-counter" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21 3.5 9.5a9.5 9.5 0 0 1 17 0Z" fill="#f2b8b0" />
      </svg>
      {shells} {shells === 1 ? 'shell' : 'shells'}
    </div>
  )
}
