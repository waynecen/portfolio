import { pressAttack, releaseAttack } from '../combat/combat'
import { putAwayRod, reel } from '../life/fishing'
import { moveFocus, openPanelElement } from './focus'
import { actions } from './input'
import { toggleBag } from '../life/inventory'
import { advance, closePanel, interact, toggleLog, toggleSettings } from './interact'
import { leavePhoto, nextPose, shoot, togglePhoto, zoomBy } from '../ui/photo'
import { unlock } from './sfx'
import { useGame } from './store'
import { stopEdit } from '../house/edit'
import { putter } from './putt'

// A controller, read once a frame (polled from <Gamepad> in Game.tsx; the browser has no events for
// sticks). Standard layout, named for an Xbox pad:
// - Left stick or d-pad: walk (or, in photo mode, slide the camera). A trigger or a stick click: sprint.
// - A: talk, read, use. B: roll, or reel in. X: the sword (hold to charge). Y: the bag, or put the rod away.
// - RB: photo mode. View: the log. Menu: the settings.
// - In a panel, the d-pad or stick moves between controls (arrow keys for the bag's grid), A presses,
//   B closes. In photo mode, A takes the photo, B or RB leaves, X changes the pose, LB or LT zooms out and RT in.

const DEAD = 0.22 // stick dead zone
const NAV = 0.6 // in a panel, how far the stick must lean to count as a press
const TRIGGER = 0.3

/** Per-frame state, outside React: the stick's walk (-1..1, z toward the camera) and the sprint, read by Player.tsx. */
export const pad = { x: 0, z: 0, sprint: false }

const was: boolean[] = [] // buttons held last frame
const wasNav = { up: false, down: false, left: false, right: false }
let active = false // a pad has been read since it was connected


// Arrow keys sent to whatever has focus in a panel, so the bag's grid can be walked as with a keyboard.
function arrow(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
  const el = document.activeElement
  const target = el instanceof HTMLElement && openPanelElement()?.contains(el) ? el : openPanelElement()
  if (!target) return
  // A slider moves with left and right, as it would with the keys.
  if (el instanceof HTMLInputElement && el.type === 'range' && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    if (key === 'ArrowLeft') el.stepDown()
    else el.stepUp()
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }
  const ev = new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
  if (!ev.defaultPrevented && (key === 'ArrowUp' || key === 'ArrowDown')) moveFocus(key === 'ArrowUp' ? -1 : 1)
}

export function pollGamepad() {
  const pads = navigator.getGamepads?.() ?? []
  let gp: Gamepad | null = null
  for (const p of pads) if (p && p.connected) gp = gp ?? p
  if (!gp) {
    if (active) {
      pad.x = pad.z = 0
      pad.sprint = false
      releaseAttack()
      was.length = 0
      active = false
    }
    return
  }
  const b = (i: number) => (gp.buttons[i]?.pressed ?? false) || (gp.buttons[i]?.value ?? 0) > TRIGGER
  const ax = gp.axes[0] ?? 0
  const az = gp.axes[1] ?? 0
  const len = Math.hypot(ax, az)
  const stickOn = len > DEAD
  // Rescale past the dead zone so a light push still walks slowly rather than jumping to a stride.
  const k = stickOn ? Math.min(1, (len - DEAD) / (1 - DEAD)) / len : 0
  const dx = +b(15) - +b(14)
  const dz = +b(13) - +b(12)
  const x = ax * k + dx
  const z = az * k + dz

  // Presses and releases since last frame.
  const pressed: boolean[] = []
  const released: boolean[] = []
  for (let i = 0; i < gp.buttons.length; i++) {
    const now = b(i)
    const before = was[i] ?? false
    pressed[i] = now && !before
    released[i] = !now && before
    was[i] = now
  }
  if (!active && pressed.some(Boolean)) unlock()
  active = true

  const playing = document.body.classList.contains('playing')
  const s = useGame.getState()
  const inPanel = s.panel !== null

  // Walking (not in a panel: there the stick moves between controls).
  pad.x = playing && !inPanel ? x : 0
  pad.z = playing && !inPanel ? z : 0
  pad.sprint = playing && (b(6) || b(7) || b(10))
  if (!playing) return

  if (inPanel) {
    const nav = { up: z < -NAV, down: z > NAV, left: x < -NAV, right: x > NAV }
    if (nav.up && !wasNav.up) arrow('ArrowUp')
    if (nav.down && !wasNav.down) arrow('ArrowDown')
    if (nav.left && !wasNav.left) arrow('ArrowLeft')
    if (nav.right && !wasNav.right) arrow('ArrowRight')
    Object.assign(wasNav, nav)
    if (pressed[0] && document.activeElement instanceof HTMLElement && openPanelElement()?.contains(document.activeElement)) document.activeElement.click()
    if (pressed[1]) closePanel()
    if (pressed[9] && s.panel === 'settings') toggleSettings()
    if (pressed[3] && s.panel === 'inventory') toggleBag()
    if (pressed[8] && s.panel === 'log') toggleLog()
    return
  }
  wasNav.up = wasNav.down = wasNav.left = wasNav.right = false

  if (s.photo) {
    if (pressed[0]) shoot()
    if (pressed[1] || pressed[5]) leavePhoto()
    if (pressed[2]) nextPose()
    if (pressed[4] || pressed[6]) zoomBy(1)
    if (pressed[7]) zoomBy(-1)
    return
  }
  if (s.editing) {
    if (pressed[1]) stopEdit()
    return
  }
  // At the golf ball (golf/golf.ts): the stick aims, X charges and putts, A or B steps away.
  if (s.putting) {
    if (pressed[2]) putter.press()
    else if (released[2]) putter.release()
    if (pressed[0] || pressed[1]) putter.leave()
    return
  }

  if (pressed[0]) interact()
  if (pressed[1] && !advance() && !reel()) actions.roll = true
  if (pressed[2]) pressAttack()
  else if (released[2]) releaseAttack()
  if (pressed[3] && !putAwayRod()) toggleBag()
  if (pressed[5]) togglePhoto()
  if (pressed[8]) toggleLog()
  if (pressed[9]) toggleSettings()
}
