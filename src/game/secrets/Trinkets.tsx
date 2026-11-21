import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MeshLambertMaterial, OctahedronGeometry, type Group } from 'three'
import { register } from '../core/interact'
import { isInland } from '../world/Island'
import { built, roadTiles } from '../world/pois'
import { findSecret, SECRETS, useSecrets, type Secret } from './secrets'
import { reducedMotion } from '../core/settings'
import { trees } from '../world/Trees'

// Where the odd trinkets wait (secrets.ts): small spinning stars, tucked into out-of-the-way spots
// (deep in the forest, the far east tip, behind the house). Walking up gives the "Pick up" prompt.

const RANGE = 1
const FLOAT = 0.4
const SPIN = 2.4 // radians per second

// The nearest tile to `at` that's grass, off the roads, clear of trees and not under the house.
const roads = new Set(roadTiles.map((t) => `${t.i},${t.j}`))
const treeTiles = new Set(trees.map((t) => `${Math.round(t.x)},${Math.round(t.z)}`))
function settle(at: Secret['at']) {
  for (let r = 0; r < 8; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        const i = at.i + di
        const j = at.j + dj
        if (isInland(i, j, 1) && !roads.has(`${i},${j}`) && !treeTiles.has(`${i},${j}`) && !built(i, j)) return { x: i, z: j }
      }
  return { x: at.i, z: at.j }
}
/** Where each trinket waits. */
export const secretSpots = Object.fromEntries(SECRETS.map((s) => [s.id, settle(s.at)]))

const geometry = new OctahedronGeometry(0.14, 0)

function Trinket({ secret }: { secret: Secret }) {
  const group = useRef<Group>(null)
  const { x, z } = secretSpots[secret.id]
  const material = useRef(new MeshLambertMaterial({ color: secret.color, emissive: secret.color, emissiveIntensity: 0.5, flatShading: true }))
  useEffect(() => () => material.current.dispose(), [])
  useEffect(() => register({ x, z, range: RANGE, prompt: 'Pick up', onInteract: () => findSecret(secret.id) }), [x, z, secret])

  useFrame(({ clock }) => {
    const g = group.current
    if (!g || reducedMotion()) return
    g.rotation.y = clock.elapsedTime * SPIN
    g.position.y = FLOAT + Math.sin(clock.elapsedTime * 3) * 0.05
  })

  return (
    <group ref={group} position={[x, FLOAT, z]}>
      <mesh geometry={geometry} material={material.current} />
      <mesh geometry={geometry} material={material.current} rotation={[Math.PI / 4, 0, Math.PI / 4]} scale={0.8} />
    </group>
  )
}

/** Every trinket not found yet. */
export function Trinkets() {
  const found = useSecrets((s) => s.found)
  return (
    <>
      {SECRETS.filter((s) => !found.includes(s.id)).map((s) => (
        <Trinket key={s.id} secret={s} />
      ))}
    </>
  )
}
