import { useGame } from './store'

// Keyboard focus around the panels (the bag, the log, the settings, the shop, the record player and
// the touch menu). Each panel puts focus on its first control when it opens; this keeps Tab inside
// the open panel, and when it closes, hands focus back to the button that opened it, if that was
// reached from the keyboard. A panel opened by a key press leaves focus on the game.

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The open panel's element, if any. */
export const openPanelElement = () => document.querySelector<HTMLElement>('#game [role="dialog"]')

/** The controls in the open panel that Tab can reach, in order. */
export function focusables(): HTMLElement[] {
  const panel = openPanelElement()
  return panel ? [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null) : []
}

/** Moves focus `by` controls along the open panel, wrapping round. */
export function moveFocus(by: number) {
  const list = focusables()
  if (!list.length) return
  const at = list.indexOf(document.activeElement as HTMLElement)
  const next = at < 0 ? (by > 0 ? 0 : list.length - 1) : (at + by + list.length) % list.length
  list[next].focus()
}

export function bindFocus(): () => void {
  let opener: HTMLElement | null = null
  const unsubscribe = useGame.subscribe((s, prev) => {
    if (s.panel && !prev.panel) {
      const el = document.activeElement
      opener = el instanceof HTMLElement && el !== document.body && el.matches(':focus-visible') ? el : null
    } else if (!s.panel && prev.panel) {
      const el = opener
      opener = null
      if (el?.isConnected) el.focus({ preventScroll: true })
    }
  })
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !useGame.getState().panel) return
    const list = focusables()
    if (!list.length) return
    const first = list[0]
    const last = list[list.length - 1]
    const inside = list.includes(document.activeElement as HTMLElement)
    if (e.shiftKey && (document.activeElement === first || !inside)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
      e.preventDefault()
      first.focus()
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => {
    unsubscribe()
    window.removeEventListener('keydown', onKeyDown)
  }
}
