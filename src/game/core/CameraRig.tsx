import { useFrame } from '@react-three/fiber'
import { MathUtils, type PerspectiveCamera } from 'three'
import { CAVE, CAVE_PITCH, caveRoom, INTERIOR, ROOM } from '../world/layout'
import { useEdit } from '../house/edit'
import { panPhoto, photoCam } from '../ui/photo'
import { reducedMotion } from './settings'
import { cameraNudge, cameraShake, cameraSnap, cameraZoom, playerPos, playerVel } from './state'
import { useGame } from './store'

export const HEIGHT = 8
export const DISTANCE = 10.25 // about 38°, well under 45°, so the curved horizon shows (curve.ts)
const LAMBDA = 4 // higher = snappier follow
const FLIP = 9 // in the cave, how quickly the camera slides from one room to the next
const STEADY = 30 // with reduced motion: close enough to locked on that nothing seems to drift or sway
const ROOM_MARGIN = 1 // indoors, keep at least this much black beside the walls when the screen is wide enough
const ROOM_SHIFT = -0.5 // indoors, aim this far behind the room's centre so the tall back wall stays in view

const ZOOM = 0.18 // a catch's zoom: how much nearer the camera comes, as a share of its distance
const ZOOM_TIME = 0.9 // seconds in and back out

const LEAD = 0.9 // outdoors, how far ahead of the player the camera looks while walking (units at walking speed)
const WALK = 2.5 // the player's walking speed (SPEED in Player.tsx), so LEAD is per walking pace
const LEAD_EASE = 1.6 // how slowly the lead follows a change of direction: a slight lag, never a swing
const SHAKE_TIME = 0.45 // seconds a shake lasts, dying away
const SHAKE_RATE = 38 // how fast it trembles, rad/s
const NUDGE = 0.35 // a nudge leans this share of the way toward its point
const NUDGE_TIME = 1.4 // seconds in and back

const SLANT = Math.hypot(HEIGHT, DISTANCE) // camera's distance to the point it looks at
const lead = { x: 0, z: 0 }

/** Shakes the camera for a moment (a big find, a hole in one). Nothing with reduced motion. */
export function shakeCamera(amount = 0.12) {
  if (reducedMotion()) return
  cameraShake.t = 0
  cameraShake.amount = amount
}

/** Leans the camera toward (x, z) and back (a hole in one, toward the cup). Nothing with reduced motion. */
export function nudgeCamera(x: number, z: number) {
  if (reducedMotion()) return
  cameraNudge.t = 0
  cameraNudge.x = x
  cameraNudge.z = z
}

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
    }
    // Outdoors, look a little ahead of the way the player walks, easing in and out so turns don't swing it.
    const photo = useGame.getState().photo
    const leading = scene === 'world' && !photo && !reducedMotion()
    const k = 1 - Math.exp(-LEAD_EASE * dt)
    lead.x += ((leading ? playerVel.x / WALK : 0) * LEAD - lead.x) * k
    lead.z += ((leading ? playerVel.z / WALK : 0) * LEAD - lead.z) * k
    tx += lead.x
    tz += lead.z
    // A nudge toward a point (a hole in one): out and back along a smooth hump.
    if (cameraNudge.t >= 0) {
      cameraNudge.t += dt
      if (cameraNudge.t >= NUDGE_TIME) cameraNudge.t = -1
      else {
        const hump = Math.sin((Math.PI * cameraNudge.t) / NUDGE_TIME) * NUDGE
        tx += (cameraNudge.x - tx) * hump
        tz += (cameraNudge.z - tz) * hump
      }
    }
    // Photo mode (photo.ts): slid aside by the walk keys, and zoomed.
    if (photo) {
      panPhoto(dt)
      tx += photoCam.x
      tz += photoCam.z
    }
    // A catch's zoom (fishing.ts): in toward the player and back out, along the same view angle.
    let near = 1
    if (cameraZoom.t >= 0) {
      cameraZoom.t += dt
      if (cameraZoom.t >= ZOOM_TIME) cameraZoom.t = -1
      else near = 1 - ZOOM * Math.sin((Math.PI * cameraZoom.t) / ZOOM_TIME)
    }
    if (photo) near *= photoCam.zoom
    tz += DISTANCE * near
    if (cameraSnap.pending) {
      // Just arrived somewhere (see scene.ts): cut straight there rather than gliding across the map.
      cameraSnap.pending = false
      p.x = tx
      p.z = tz
    } else {
      // With reduced motion the camera stays locked to its target rather than drifting after it.
      const lambda = reducedMotion() && !photo ? STEADY : scene === 'cave' ? FLIP : LAMBDA
      p.x = MathUtils.damp(p.x, tx, lambda, dt)
      p.z = MathUtils.damp(p.z, tz, lambda, dt)
    }
    p.y = HEIGHT * near
    // Look along a fixed offset so the view angle never swims while easing.
    camera.lookAt(p.x, 0, p.z - DISTANCE * near)
    // A shake: a quick tremble that dies away, added after the look so it never builds up in the follow.
    if (cameraShake.t >= 0) {
      cameraShake.t += dt
      if (cameraShake.t >= SHAKE_TIME) cameraShake.t = -1
      else {
        const fade = 1 - cameraShake.t / SHAKE_TIME
        const a = cameraShake.amount * fade * fade
        camera.position.x += Math.sin(cameraShake.t * SHAKE_RATE) * a
        camera.position.y += Math.sin(cameraShake.t * SHAKE_RATE * 1.3 + 1) * a * 0.6
      }
    }
  })
  return null
}
