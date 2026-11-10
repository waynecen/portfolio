// Keyboard state lives outside React so per-frame reads don't trigger renders.
export const keys = { forward: false, back: false, left: false, right: false }

// Analog input from the on-screen joystick, each axis in -1..1 (z is toward the camera).
export const stick = { x: 0, z: 0 }

type Dir = keyof typeof keys

const codes: Record<string, Dir> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
}

function isTyping(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

function reset() {
  keys.forward = keys.back = keys.left = keys.right = false
}

// Calls `cb` when E or Enter is pressed in the game view (not on a focused control).
export function bindInteract(cb: () => void): () => void {
  const onDown = (e: KeyboardEvent) => {
    if (e.repeat || (e.code !== 'KeyE' && e.code !== 'Enter')) return
    if (!document.body.classList.contains('playing') || isTyping(e.target)) return
    if (e.target instanceof HTMLElement && e.target.closest('a, button')) return
    cb()
  }
  window.addEventListener('keydown', onDown)
  return () => window.removeEventListener('keydown', onDown)
}

export function bindKeys(): () => void {
  const set = (down: boolean) => (e: KeyboardEvent) => {
    const dir = codes[e.code]
    if (!dir || isTyping(e.target) || !document.body.classList.contains('playing')) return
    if (e.code.startsWith('Arrow')) e.preventDefault()
    keys[dir] = down
  }
  const onDown = set(true)
  const onUp = set(false)
  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', reset)
  window.addEventListener('viewchange', reset)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', reset)
    window.removeEventListener('viewchange', reset)
    reset()
  }
}
