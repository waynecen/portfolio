import { useFrame } from '@react-three/fiber'
import { MathUtils, type PerspectiveCamera } from 'three'
import { INTERIOR, ROOM } from './layout'
import { cameraSnap, playerPos } from './state'
import { useGame } from './store'

export const HEIGHT = 12
export const DISTANCE = 12
const LAMBDA = 4 // higher = snappier follow
const ROOM_MARGIN = 1 // indoors, keep at least this much black beside the walls when the screen is wide enough
const ROOM_SHIFT = -0.5 // indoors, aim this far behind the room's centre so the tall back wall stays in view

const SLANT = Math.hypot(HEIGHT, DISTANCE) // camera's distance to the point it looks at

export function CameraRig() {
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1)
    const p = camera.position
    let tx = playerPos.x
    let tz = playerPos.z
    if (useGame.getState().scene === 'house') {
      // Indoors the camera holds still on the room, like a diorama. On a narrow screen the room
      // doesn't fit, so it follows the player sideways, but never further than shows the walls.
      const cam = camera as PerspectiveCamera
      const halfWidth = SLANT * Math.tan(MathUtils.degToRad(cam.fov / 2)) * cam.aspect
      const slack = Math.max(0, ROOM.hx + 0.5 + ROOM_MARGIN - halfWidth)
      tx = INTERIOR.x + MathUtils.clamp(playerPos.x - INTERIOR.x, -slack, slack)
      tz = INTERIOR.z + ROOM_SHIFT
    }
    tz += DISTANCE
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
