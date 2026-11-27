import { Matrix4, Vector3, type DirectionalLight } from 'three'
import { playerPos } from '../core/state'

// The sun's shadow (Atmosphere.tsx's directional light): its shadow box follows the player, so it
// only ever covers what's near enough to see, snapped to whole shadow-map texels so edges don't
// shimmer as the player walks. Which meshes cast is Shadows.tsx.

export const BOX = 13 // half-size of the shadow box, world units (26 × 26 round the player)
export const MAP = 1024 // shadow map size; BOX × 2 / MAP is one texel (about 2.5 cm)
const FAR = 40 // how far up the sun's direction the light sits, and the box's depth
const BIAS = -0.0004
const NORMAL_BIAS = 0.025

/** Sets up the sun's shadow; call from the component that owns the light. */
export function setUpShadow(light: DirectionalLight) {
  light.castShadow = true
  const s = light.shadow
  s.mapSize.set(MAP, MAP)
  s.bias = BIAS
  s.normalBias = NORMAL_BIAS
  s.radius = 5 // the blur that softens PCF's edges, in texels (about 13 cm)
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
