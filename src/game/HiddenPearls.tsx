import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, SphereGeometry, type Group } from 'three'
import { burst } from './Dust'
import { register } from './interact'
import { findPearl, hiddenBy, PEARLS, usePearls, type Pearl } from './pearls'
import { reducedMotion } from './settings'
import { playerPos } from './state'

// The pearls still to find (pearls.ts). One lying in the open (or behind a tree, or in grass that's
// been cut) glints on the ground; a buried one shows only as a cross of disturbed earth, and only
// once the player is close: it's found by walking about, not from across the island.

const RANGE = 1 // how close to pick up or dig
const NOTICE = [1.6, 2.6] // a buried pearl's earth shows fully within the first, not at all past the second
const GLINT = [0.15, 0.6] // a pearl's glow, dim to bright, as it glints

const pearlGeometry = new SphereGeometry(0.09, 12, 8)
const pearlMaterial = new MeshLambertMaterial({ color: '#f6f0ea', emissive: '#fff4e8', emissiveIntensity: GLINT[0] })
const markGeometry = new PlaneGeometry(0.46, 0.08).rotateX(-Math.PI / 2)
const DIRT = new Color('#8a6a48')

/** A pearl on the ground, to pick up. */
function Loose({ p }: { p: Pearl }) {
  useEffect(() => register({ x: p.x, z: p.z, range: RANGE, prompt: 'Pick up', onInteract: () => findPearl(p.id) }), [p])
  return <mesh geometry={pearlGeometry} material={pearlMaterial} position={[p.x, 0.09, p.z]} />
}

/** A buried pearl: a cross of earth, fading in as the player nears, to dig up. */
function Buried({ p }: { p: Pearl }) {
  const material = useMemo(() => new MeshBasicMaterial({ color: '#6b5238', transparent: true, opacity: 0, depthWrite: false }), [])
  useEffect(() => () => material.dispose(), [material])
  const a = useRef<Group>(null)
  useEffect(
    () =>
      register({
        x: p.x,
        z: p.z,
        range: RANGE,
        prompt: 'Dig',
        onInteract: () => {
          burst(p.x, p.z, 8, DIRT)
          findPearl(p.id)
        },
      }),
    [p],
  )
  useFrame(() => {
    const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z)
    material.opacity = 1 - Math.min(1, Math.max(0, (d - NOTICE[0]) / (NOTICE[1] - NOTICE[0])))
    if (a.current) a.current.visible = material.opacity > 0
  })
  return (
    <group ref={a} position={[p.x, 0.012, p.z]}>
      <mesh geometry={markGeometry} material={material} rotation-y={0.6} />
      <mesh geometry={markGeometry} material={material} rotation-y={-0.6} />
    </group>
  )
}

/** Every pearl not yet found, where it's hidden. Drawn with the island. */
export function Pearls() {
  const found = usePearls((s) => s.found)
  const revealed = usePearls((s) => s.revealed)
  // One glint for them all: a slow shimmer now and then rather than a steady glow.
  useFrame(({ clock }) => {
    const t = reducedMotion() ? 0 : Math.max(0, Math.sin(clock.elapsedTime * 1.7)) ** 6
    pearlMaterial.emissiveIntensity = GLINT[0] + (GLINT[1] - GLINT[0]) * t
  })
  return (
    <>
      {PEARLS.filter((p) => !found.includes(p.id)).map((p) => {
        const hide = hiddenBy(p)
        if (hide === 'dig') return <Buried key={p.id} p={p} />
        if (hide === 'grass' && !revealed.includes(p.id)) return null // still under its tuft (Grass.tsx)
        return <Loose key={p.id} p={p} />
      })}
    </>
  )
}
