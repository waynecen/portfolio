import { pressAttack, releaseAttack } from '../combat/combat'
import { editKey, toggleEdit } from '../house/edit'
import { putAwayRod, reel, stopFishing } from '../life/fishing'
import { toggleBag } from '../life/inventory'
import { advance, busy, closeDialogue, closePanel, interact, toggleLog, toggleSettings } from './interact'
import { actionFor, type Action } from './keymap'
import { photoKey, togglePhoto } from '../ui/photo'
import { putter } from './putt'
import { unlock } from './sfx'
import { useGame } from './store'

// Keyboard state lives outside React so per-frame reads don't trigger renders.
export const keys = { forward: false, back: false, left: false, right: false, sprint: false }

// Analog input from the on-screen joystick, each axis in -1..1 (z is toward the camera).
export const stick = { x: 0, z: 0 }

// One-shot action requests, set by input and consumed (cleared) by the player each frame.

// Held on-screen buttons (touch). Kept apart from `keys` so a Shift keyup can't cancel a held B.
export const buttons = { sprint: false }

type Dir = keyof typeof keys
const DIRS = new Set<Action>(['forward', 'back', 'left', 'right', 'sprint'])
const isDir = (a: Action | undefined): a is Dir => a !== undefined && DIRS.has(a)

function isTyping(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

function reset() {
  keys.forward = keys.back = keys.left = keys.right = keys.sprint = false
  buttons.sprint = false
  releaseAttack()
}

// Which key does what is in keymap.ts (remappable in the settings). Actions other than walking are
// ignored on focused links and buttons, so those keep working.

export function bindKeys(): () => void {
  const set = (down: boolean) => (e: KeyboardEvent) => {
    if (down) unlock() // audio may only start after a gesture
    const action = e.code === 'Escape' ? undefined : actionFor(e.code)
    if (useGame.getState().editing) {
      // Edit mode has its own keys (edit.ts). Releases still count, so nothing stays held down after.
      if (isDir(action) && !down) keys[action] = false
      if (down && !isTyping(e.target) && document.body.classList.contains('playing')) editKey(e)
      return
    }
    // Photo mode (photo.ts) has a few keys of its own; the walk keys slide its camera.
    if (useGame.getState().photo && down && !isTyping(e.target) && document.body.classList.contains('playing')) {
      if (action === 'photo') {
        if (!e.repeat) togglePhoto()
        return
      }
      if (!e.repeat && photoKey(e)) return
    }
    // The sword's keys (J or X unless remapped; the left mouse button is below). Down swings (and starts a charge), up lets a charged spin go (combat.ts).
    if (action === 'attack') {
      if (isTyping(e.target) || !document.body.classList.contains('playing')) return
      if (useGame.getState().putting) {
        // At the golf ball the sword's key charges the putt instead (golf/golf.ts).
        if (down && !e.repeat) putter.press()
        else if (!down) putter.release()
        return
      }
      if (down && !e.repeat) pressAttack()
      else if (!down) releaseAttack()
      return
    }
    if (e.code === 'Escape' || (action && !isDir(action))) {
      if (isTyping(e.target) || !document.body.classList.contains('playing')) return
      if (e.target instanceof HTMLElement && e.target.closest('a, button')) return
      if (e.code === 'Space') e.preventDefault() // don't scroll the page
      if (!down || e.repeat) return
      if (e.code === 'Escape') {
        // Escape closes whatever has the player's attention; with nothing open, it opens the settings.
        if (!busy()) toggleSettings()
        else {
          if (useGame.getState().putting) putter.leave()
          closeDialogue()
          closePanel()
          stopFishing()
        }
      } else if (action === 'continue') {
        // Space advances dialogue when it's open, or reels in a line that's out.
        if (!advance()) reel()
      } else if (action === 'edit') toggleEdit()
      else if (action === 'log') toggleLog()
      else if (action === 'settings') toggleSettings()
      else if (action === 'photo') togglePhoto()
      else if (action === 'bag') {
        if (!putAwayRod()) toggleBag() // B puts away a rod in hand, otherwise opens the bag
      } else interact()
      return
    }
    if (!isDir(action) || isTyping(e.target) || !document.body.classList.contains('playing')) return
    if (e.code.startsWith('Arrow')) e.preventDefault()
    keys[action] = down
  }
  const onDown = set(true)
  const onUp = set(false)
  // The mouse, on the game itself (not the HUD over it): the left button is the sword like J, the
  // right button puts the rod away like B. Edit mode reads the mouse its own way (EditRoom.tsx).
  const onGame = (e: MouseEvent) =>
    e.target instanceof HTMLCanvasElement && document.body.classList.contains('playing') && !useGame.getState().editing
  const onPointerDown = (e: PointerEvent) => {
    unlock() // audio may only start after a gesture
    if (e.pointerType !== 'mouse' || !onGame(e) || useGame.getState().putting) return // the golf reads its own drag
    if (e.button === 0) pressAttack()
    else if (e.button === 2) putAwayRod()
  }
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button === 0) releaseAttack()
  }
  const onContextMenu = (e: MouseEvent) => {
    if (onGame(e)) e.preventDefault() // the right button is for the rod, not the browser's menu
  }
  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('blur', reset)
  window.addEventListener('viewchange', reset)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('contextmenu', onContextMenu)
    window.removeEventListener('blur', reset)
    window.removeEventListener('viewchange', reset)
    reset()
  }
}
