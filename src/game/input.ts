// Keyboard state lives outside React so per-frame reads don't trigger renders.
export const keys = { forward: false, back: false, left: false, right: false }

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
