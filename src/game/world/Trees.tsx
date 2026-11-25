import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { ConeGeometry, CylinderGeometry, MeshLambertMaterial, Object3D, type InstancedMesh } from 'three'
import { addCollider } from '../core/collision'
import { winter } from './season'
import { playerPos } from '../core/state'
import { useSceneFrame } from '../core/sceneFrame'
import { sway } from '../core/wind'
import { canopyColor, drawn, seeThrough, SWAY, treePlayer } from './treeLook'

// The island's trees: the Tripo pine (PineModel.tsx), one instanced mesh for every tree on the island.
// While it downloads, placeholders stand in: a trunk and a low-poly cone, drawn the same way. Where
// they stand is forest.ts; what they share (thinning out in front of the player, sway, season colours) is treeLook.ts.

const TRUNK_RADIUS = 0.25 // collision radius at scale 1; a little wider than the trunk so the pill doesn't clip the canopy
const MAX_TRUNK = 0.3 // and at most this, so the pill (0.35 radius) still fits between forest trees corner to corner
const trunkGeometry = new CylinderGeometry(0.08, 0.12, 0.5, 6).translate(0, 0.25, 0)
const canopyGeometry = new ConeGeometry(0.5, 1.2, 7).translate(0, 1.05, 0)
const trunkMaterial = sway(seeThrough(new MeshLambertMaterial({ color: '#8a5a3b', flatShading: true })), SWAY)
// White, so each tree's own colour shows (canopyColor): green, blossom in spring, turning in autumn.
const canopyMaterial = sway(seeThrough(new MeshLambertMaterial({ color: '#ffffff', flatShading: true })), SWAY)
// Winter: a white cone over the canopy's top half, a little wider so no green shows through its rim.
const capGeometry = new ConeGeometry(0.25, 0.56, 7).translate(0, 1.37, 0)
const capMaterial = sway(seeThrough(new MeshLambertMaterial({ color: '#f4f7fb', flatShading: true })), SWAY)

const PineModel = lazy(() => import('./PineModel'))

/** Every tree on the island and the islet, with its trunk's collider. */
export function Trees() {
  useEffect(() => {
    const removers = drawn.map((t) => addCollider({ kind: 'circle', x: t.x, z: t.z, r: Math.min(MAX_TRUNK, TRUNK_RADIUS * t.scale) }))
    return () => removers.forEach((remove) => remove())
  }, [])

  useSceneFrame('world', () => {
    treePlayer.value.set(playerPos.x, playerPos.z)
  })

  return (
    <Suspense fallback={<Placeholders />}>
      <PineModel />
    </Suspense>
  )
}

function Placeholders() {
  const trunks = useRef<InstancedMesh>(null)
  const canopies = useRef<InstancedMesh>(null)
  const caps = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const dummy = new Object3D()
    drawn.forEach((t, n) => {
      dummy.position.set(t.x, 0, t.z)
      dummy.rotation.y = t.turn
      dummy.scale.setScalar(t.scale)
      dummy.updateMatrix()
      trunks.current?.setMatrixAt(n, dummy.matrix)
      canopies.current?.setMatrixAt(n, dummy.matrix)
      canopies.current?.setColorAt(n, canopyColor(n))
      caps.current?.setMatrixAt(n, dummy.matrix)
    })
    for (const mesh of [trunks.current, canopies.current, caps.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere() // cover every instance, so the forest isn't culled when the origin is off screen
    }
  }, [])

  return (
    <>
      <instancedMesh ref={trunks} args={[trunkGeometry, trunkMaterial, drawn.length]} />
      <instancedMesh ref={canopies} args={[canopyGeometry, canopyMaterial, drawn.length]} />
      {winter && <instancedMesh ref={caps} args={[capGeometry, capMaterial, drawn.length]} />}
    </>
  )
}
