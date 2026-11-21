import { editKey, toggleEdit } from './edit'
import { putAwayRod, reel, stopFishing } from './fishing'
import { pointMe } from './guide'
import { toggleBag } from './inventory'
import { advance, closeDialogue, closePanel, interact, toggleLog, toggleSettings } from './interact'
import { unlock } from './sfx'
import { useGame } from './store'

// Keyboard state lives outside React so per-frame reads don't trigger renders.
export const keys = { forward: false, back: false, left: false, right: false, sprint: false }

// Analog input from the on-screen joystick, each axis in -1..1 (z is toward the camera).
export const stick = { x: 0, z: 0 }

// One-shot action requests, set by input and consumed (cleared) by the player each frame.
export const actions = { roll: false }

// Held on-screen buttons (touch). Kept apart from `keys` so a Shift keyup can't cancel a held B.
export const buttons = { sprint: false }

type Dir = keyof typeof keys

const codes: Record<string, Dir> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
}

function isTyping(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

function reset() {
  keys.forward = keys.back = keys.left = keys.right = keys.sprint = false
  actions.roll = false
  buttons.sprint = false
}

// Keys that act on the world. Ignored on focused links and buttons so those keep working.
const ACTION_KEYS = new Set(['Space', 'KeyE', 'Enter', 'Escape', 'KeyF', 'KeyB', 'KeyG', 'KeyL', 'KeyO'])

export function bindKeys(): () => void {
  const set = (down: boolean) => (e: KeyboardEvent) => {
    if (down) unlock() // audio may only start after a gesture
    if (useGame.getState().editing) {
      // Edit mode has its own keys (edit.ts). Releases still count, so nothing stays held down after.
      const dir = codes[e.code]
      if (dir && !down) keys[dir] = false
      if (down && !isTyping(e.target) && document.body.classList.contains('playing')) editKey(e)
      return
    }
    if (ACTION_KEYS.has(e.code)) {
      if (isTyping(e.target) || !document.body.classList.contains('playing')) return
      if (e.target instanceof HTMLElement && e.target.closest('a, button')) return
      if (e.code === 'Space') e.preventDefault() // don't scroll the page
      if (!down || e.repeat) return
      if (e.code === 'Space') {
        // Space advances dialogue when it's open, reels in a line that's out, otherwise rolls.
        if (!advance() && !reel()) actions.roll = true
      } else if (e.code === 'Escape') {
        closeDialogue()
        closePanel()
        stopFishing()
      } else if (e.code === 'KeyF') toggleEdit()
      else if (e.code === 'KeyG') pointMe()
      else if (e.code === 'KeyL') toggleLog()
      else if (e.code === 'KeyO') toggleSettings()
      else if (e.code === 'KeyB') {
        if (!putAwayRod()) toggleBag() // B puts away a rod in hand, otherwise opens the bag
      }
      else interact()
      return
    }
    const dir = codes[e.code]
    if (!dir || isTyping(e.target) || !document.body.classList.contains('playing')) return
    if (e.code.startsWith('Arrow')) e.preventDefault()
    keys[dir] = down
  }
  const onDown = set(true)
  const onUp = set(false)
  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('blur', reset)
  window.addEventListener('viewchange', reset)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('blur', reset)
    window.removeEventListener('viewchange', reset)
    reset()
  }
}
