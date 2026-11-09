import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { playerPos } from './state'

const HEIGHT = 10
const DISTANCE = 10
const LAMBDA = 4 // higher = snappier follow

export function CameraRig() {
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1)
    const p = camera.position
    p.x = MathUtils.damp(p.x, playerPos.x, LAMBDA, dt)
    p.y = HEIGHT
    p.z = MathUtils.damp(p.z, playerPos.z + DISTANCE, LAMBDA, dt)
    // Look along a fixed offset so the view angle never swims while easing.
    camera.lookAt(p.x, 0, p.z - DISTANCE)
  })
  return null
}
