import type { ReactNode } from 'react'
import { keyName, type Action } from '../core/keymap'
import { isTouch } from '../core/quality'

/**
 * A cream chip at the top of the screen (the Bag, Put away rod, Edit room): a button with its key
 * shown in front on a keyboard. `className` places it (`.hud-chip` in style.css is the look).
 */
export function Chip({ action, className, onClick, label, children }: { action: Action; className: string; onClick: () => void; label?: string; children: ReactNode }) {
  return (
    <button type="button" className={`hud-chip ${className}`} onClick={onClick} aria-label={label}>
      {!isTouch && <kbd>{keyName(action)}</kbd>}
      {children}
    </button>
  )
}
