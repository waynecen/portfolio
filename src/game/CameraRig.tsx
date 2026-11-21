import { useFrame } from '@react-three/fiber'
import { MathUtils, type PerspectiveCamera } from 'three'
import { CAVE, CAVE_PITCH, caveRoom, INTERIOR, ROOM } from './layout'
import { useEdit } from './edit'
import { guide } from './guide'
import { cameraSnap, cameraZoom, playerPos } from './state'
import { useGame } from './store'

export const HEIGHT = 8
export const DISTANCE = 10.25 // about 38°, well under 45°, so the curved horizon shows (curve.ts)
const LAMBDA = 4 // higher = snappier follow
const FLIP = 9 // in the cave, how quickly the camera slides from one room to the next
const ROOM_MARGIN = 1 // indoors, keep at least this much black beside the walls when the screen is wide enough
const ROOM_SHIFT = -0.5 // indoors, aim this far behind the room's centre so the tall back wall stays in view

const ZOOM = 0.18 // a catch's zoom: how much nearer the camera comes, as a share of its distance
const ZOOM_TIME = 0.9 // seconds in and back out

const SLANT = Math.hypot(HEIGHT, DISTANCE) // camera's distance to the point it looks at

export function CameraRig() {
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1)
    const p = camera.position
    let tx = playerPos.x
    let tz = playerPos.z
    const scene = useGame.getState().scene
    if (scene === 'house' || scene === 'cave') {
      // Indoors the camera holds still on the room, like a diorama. On a narrow screen the room
      // doesn't fit, so it follows the player sideways, but never further than shows the walls.
      // In the cave it holds on whichever room the player is in, and slides over when they go through a door.
      const cam = camera as PerspectiveCamera
      const halfWidth = SLANT * Math.tan(MathUtils.degToRad(cam.fov / 2)) * cam.aspect
      const slack = Math.max(0, ROOM.hx + 0.5 + ROOM_MARGIN - halfWidth)
      let cx = INTERIOR.x
      let cz = INTERIOR.z
      if (scene === 'cave') {
        const r = caveRoom(playerPos.x, playerPos.z)
        cx = CAVE.x + r.i * CAVE_PITCH.x
        cz = CAVE.z + r.j * CAVE_PITCH.z
      }
      // While editing, it follows the cursor instead, so every tile can be reached.
      const x = useGame.getState().editing ? useEdit.getState().cursor.i : playerPos.x - cx
      tx = cx + MathUtils.clamp(x, -slack, slack)
      tz = cz + ROOM_SHIFT
    } else if (guide.peek) {
      // "Point me somewhere" (guide.ts): glide over to the place for a moment, then back.
      tx = guide.x
      tz = guide.z
    }
    // A catch's zoom (fishing.ts): in toward the player and back out, along the same view angle.
    let near = 1
    if (cameraZoom.t >= 0) {
      cameraZoom.t += dt
      if (cameraZoom.t >= ZOOM_TIME) cameraZoom.t = -1
      else near = 1 - ZOOM * Math.sin((Math.PI * cameraZoom.t) / ZOOM_TIME)
    }
    tz += DISTANCE * near
    if (cameraSnap.pending) {
      // Just arrived somewhere (see scene.ts): cut straight there rather than gliding across the map.
      cameraSnap.pending = false
      p.x = tx
      p.z = tz
    } else {
      const lambda = scene === 'cave' ? FLIP : LAMBDA
      p.x = MathUtils.damp(p.x, tx, lambda, dt)
      p.z = MathUtils.damp(p.z, tz, lambda, dt)
    }
    p.y = HEIGHT * near
    // Look along a fixed offset so the view angle never swims while easing.
    camera.lookAt(p.x, 0, p.z - DISTANCE * near)
  })
  return null
}
