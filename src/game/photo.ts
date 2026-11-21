import { create } from 'zustand'
import { pad } from './core/gamepad'
import { closeDialogue, held } from './core/interact'
import { keys, stick } from './core/input'
import { actionFor } from './core/keymap'
import { reducedMotion } from './core/settings'
import { click } from './core/sfx'
import { playerFacing } from './core/state'
import { useGame } from './core/store'

// Photo mode (P, or Photo in the touch menu): the HUD steps aside, the player holds still, and the
// camera can be slid around and zoomed, at the same angle (the curved world needs it facing north).
// The character strikes a pose, and Take photo saves a PNG of the view. PhotoHud.tsx draws its
// buttons; CameraRig.tsx applies the camera's offset and zoom; PhotoCapture (PhotoHud.tsx) reads
// the canvas.

const PAN_SPEED = 6 // units/s the camera slides
const PAN_MAX = 9 // how far from the player it can go
export const ZOOM_MIN = 0.45 // nearest, as a share of the usual distance
export const ZOOM_MAX = 1.5 // farthest
const ZOOM_STEP = 0.1 // one press of Q or E, or one notch of the wheel

/** The poses, each a way to face (0 = the camera) and a height off the ground. */
export const POSES = [
  { label: 'Say cheese', heading: 0, lift: 0 },
  { label: 'Turn left', heading: -0.75, lift: 0 },
  { label: 'Turn right', heading: 0.75, lift: 0 },
  { label: 'Look out to sea', heading: Math.PI, lift: 0 },
  { label: 'Jump!', heading: 0, lift: 0.45 },
]

/** The pose, and the camera's distance (a share of the usual one) for the slider; photoCam.zoom mirrors it for the camera. */
export const usePhoto = create<{ pose: number; zoom: number }>(() => ({ pose: 0, zoom: 1 }))

/** Per-frame state, outside React: the camera's offset from the player and its zoom (CameraRig.tsx). */
export const photoCam = { x: 0, z: 0, zoom: 1 }
/** How high the pose holds the character (PillCharacter.tsx eases toward it). */
export const photoPose = { lift: 0 }

/** Hooks set by PhotoHud.tsx: `capture` (inside the canvas) renders a frame and saves it, `flash` shows the shutter. */
export const camera = { capture: (): void => {}, flash: (): void => {} }

/** Take photo: saves the view as a PNG, with a click and a flash. */
export function shoot() {
  if (!useGame.getState().photo) return
  camera.capture()
  click()
  if (!reducedMotion()) camera.flash()
}

/** P: into photo mode, or back out. Not while edit mode, a panel, a fade or fishing has the player. */
export function togglePhoto() {
  const s = useGame.getState()
  if (s.photo) return leavePhoto()
  if (held()) return
  closeDialogue()
  click()
  photoCam.x = photoCam.z = 0
  setZoom(1)
  useGame.setState({ photo: true, focus: null })
  setPose(0)
}

export function leavePhoto() {
  if (!useGame.getState().photo) return
  click()
  photoPose.lift = 0
  useGame.setState({ photo: false })
}

export function setPose(n: number) {
  const pose = ((n % POSES.length) + POSES.length) % POSES.length
  usePhoto.setState({ pose })
  playerFacing.heading = POSES[pose].heading
  playerFacing.snap = true
  photoPose.lift = POSES[pose].lift
}

export const nextPose = () => setPose(usePhoto.getState().pose + 1)

/** Sets the camera's distance, as a share of the usual one (the slider in PhotoHud.tsx). */
export function setZoom(zoom: number) {
  photoCam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
  usePhoto.setState({ zoom: photoCam.zoom })
}

/** Moves the camera nearer (negative) or farther (positive) by `notches`. */
export const zoomBy = (notches: number) => setZoom(photoCam.zoom + notches * ZOOM_STEP)

/** Each frame in photo mode (CameraRig.tsx): the walk keys and the stick slide the camera. */
export function panPhoto(dt: number) {
  const x = +keys.right - +keys.left + stick.x + pad.x
  const z = +keys.back - +keys.forward + stick.z + pad.z
  photoCam.x += x * PAN_SPEED * dt
  photoCam.z += z * PAN_SPEED * dt
  const len = Math.hypot(photoCam.x, photoCam.z)
  if (len > PAN_MAX) {
    photoCam.x *= PAN_MAX / len
    photoCam.z *= PAN_MAX / len
  }
}

/**
 * Keys in photo mode, before the usual ones (input.ts). Q and E or - and = zoom, 1 to 5 pick a pose,
 * Space and Enter take the photo, Escape leaves. Returns true if it used the key.
 */
export function photoKey(e: KeyboardEvent): boolean {
  const c = e.code
  const walks = ['forward', 'back', 'left', 'right'].includes(actionFor(c) ?? '')
  if (walks) return false // a key bound to walking slides the camera, whatever it is
  if (c === 'KeyQ' || c === 'Minus') zoomBy(1)
  else if (c === 'KeyE' || c === 'Equal') zoomBy(-1)
  else if (c >= 'Digit1' && c <= `Digit${POSES.length}` && c.length === 6) setPose(Number(c.slice(5)) - 1)
  else if (c === 'Space' || c === 'Enter') {
    if (e.target instanceof HTMLElement && e.target.closest('button')) return false // a focused button takes it
    shoot()
  }
  else if (c === 'Escape') leavePhoto()
  else return false
  e.preventDefault()
  return true
}

/** Saves the canvas as a PNG named for today (the black-and-white secret applies to it too). */
export function download(canvas: HTMLCanvasElement, mono: boolean) {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')
  if (!ctx) return
  if (mono) ctx.filter = 'grayscale(1)'
  ctx.drawImage(canvas, 0, 0)
  out.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    a.download = `island-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, 'image/png')
}
