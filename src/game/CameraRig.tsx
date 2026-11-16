import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { cameraSnap, playerPos } from './state'

export const HEIGHT = 12
export const DISTANCE = 12
const LAMBDA = 4 // higher = snappier follow

export function CameraRig() {
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1)
    const p = camera.position
    const tx = playerPos.x
    const tz = playerPos.z + DISTANCE
    if (cameraSnap.pending) {
      // Just arrived somewhere (see scene.ts): cut straight there rather than gliding across the map.
      cameraSnap.pending = false
      p.x = tx
      p.z = tz
    } else {
      p.x = MathUtils.damp(p.x, tx, LAMBDA, dt)
      p.z = MathUtils.damp(p.z, tz, LAMBDA, dt)
    }
    p.y = HEIGHT
    // Look along a fixed offset so the view angle never swims while easing.
    camera.lookAt(p.x, 0, p.z - DISTANCE)
  })
  return null
}
