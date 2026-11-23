import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Matrix4, Vector3, type DirectionalLight, type Material, type Mesh, type Object3D } from 'three'
import { playerPos } from '../core/state'

// Soft real-time shadows from the sun (Atmosphere.tsx's directional light). The light's shadow box
// follows the player, so it only ever covers what's near enough to see; it's snapped to whole
// shadow-map texels so edges don't shimmer as the player walks. The curve (core/curve.ts) is left
// out of the shadow pass, and receivers look shadows up from unbent positions too, so they agree.
//
// Every opaque mesh casts and receives, set by a light sweep of the scene each SWEEP seconds (things
// arrive late: lazy areas, models, bought furniture). Skipped: transparent and unlit (basic)
// materials, which are effects, glows and blob shadows, and anything with userData.noShadow (on the mesh or any group it sits in).

export const BOX = 13 // half-size of the shadow box, world units (26 × 26 round the player)
export const MAP = 2048 // shadow map size; BOX × 2 / MAP is one texel (about 1.3 cm)
const FAR = 40 // how far up the sun's direction the light sits, and the box's depth
const BIAS = -0.0004
const NORMAL_BIAS = 0.025
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

/** Sets up the sun's shadow; call from the component that owns the light. */
export function setUpShadow(light: DirectionalLight) {
  light.castShadow = true
  const s = light.shadow
  s.mapSize.set(MAP, MAP)
  s.bias = BIAS
  s.normalBias = NORMAL_BIAS
  s.radius = 3 // the blur that softens PCF's edges
  const c = s.camera
  c.left = -BOX
  c.right = BOX
  c.top = BOX
  c.bottom = -BOX
  c.near = 0.5
  c.far = FAR * 2
  c.updateProjectionMatrix()
}

const dir = new Vector3()
const centre = new Vector3()
const view = new Matrix4()
const texel = (BOX * 2) / MAP

/** Points the sun from `from` (a direction) at the player, with the box snapped to whole texels. */
export function followPlayer(light: DirectionalLight, from: Vector3) {
  dir.copy(from).normalize()
  // Snap the player's position in the light's view, so the map's texels stay put on the ground.
  view.lookAt(dir, centre.set(0, 0, 0), light.up).invert() // world → light view, rotation only
  centre.set(playerPos.x, 0, playerPos.z).applyMatrix4(view)
  centre.x = Math.round(centre.x / texel) * texel
  centre.y = Math.round(centre.y / texel) * texel
  centre.applyMatrix4(view.invert())
  light.target.position.copy(centre)
  light.position.copy(centre).addScaledVector(dir, FAR)
  light.target.updateMatrixWorld()
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
