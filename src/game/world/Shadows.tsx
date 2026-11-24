import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { type Material, type Mesh, type Object3D } from 'three'

// Soft real-time shadows from the sun (Atmosphere.tsx's directional light; its shadow box, which
// follows the player, is shadowBox.ts). The curve (core/curve.ts) is left
// out of the shadow pass, and receivers look shadows up from unbent positions too, so they agree.
//
// Every opaque mesh casts and receives, set by a light sweep of the scene each SWEEP seconds (things
// arrive late: lazy areas, models, bought furniture). Skipped: transparent and unlit (basic)
// materials, which are effects, glows and blob shadows, and anything with userData.noShadow (on the mesh or any group it sits in).

const SWEEP = 1 // seconds between sweeps for new meshes

const casts = (m: Material) => !m.transparent && !(m as { isMeshBasicMaterial?: boolean }).isMeshBasicMaterial
function mark(o: Object3D) {
  const mesh = o as Mesh
  if (!mesh.isMesh || o.userData.shadowSet) return
  o.userData.shadowSet = true
  for (let up: Object3D | null = o; up; up = up.parent) if (up.userData.noShadow) return
  const on = Array.isArray(mesh.material) ? mesh.material.every(casts) : casts(mesh.material)
  mesh.castShadow = on
  mesh.receiveShadow = on
}

/** Keeps every opaque mesh casting and receiving (see above). Mount once, in the Canvas. */
export function ShadowSweep() {
  const scene = useThree((s) => s.scene)
  useEffect(() => scene.traverse(mark), [scene])
  const clock = useRef(0)
  useFrame((_, delta) => {
    clock.current += delta
    if (clock.current < SWEEP) return
    clock.current = 0
    scene.traverse(mark)
  })
  return null
}
