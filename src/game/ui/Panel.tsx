import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { focusables } from '../core/focus'
import { closePanel } from '../core/interact'
import { actionFor, type Action } from '../core/keymap'
import { click } from '../core/sfx'

// The shell every panel shares (the bag, the log, the settings, the shop, the touch menu): the
// heading row with its count and ×, Escape (or the panel's own key) to close, and focus on its first
// control when it opens, unless the panel has already put focus somewhere of its own. Render it only
// while the panel is open. Tab stays inside it (focus.ts).

type Props = {
  title: string
  /** Shown beside the title, e.g. "3 of 6 found". */
  count?: ReactNode
  /** More buttons in the heading row, before the ×. */
  extra?: ReactNode
  /** The key that opened it, which closes it too (keymap.ts). */
  toggle?: Action
  className?: string
  /** For screen readers, if it differs from the title. */
  label?: string
  /** Keys the panel handles itself, first. Return true if it used the key. */
  onKey?: (e: KeyboardEvent) => boolean | void
  children: ReactNode
}

export function Panel({ title, count, extra, toggle, className, label, onKey, children }: Props) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (box.current?.contains(document.activeElement)) return
    const list = focusables()
    ;(list.find((el) => !el.classList.contains('bag-close')) ?? list[0])?.focus()
  }, [])

  const onKeyDown = (e: KeyboardEvent) => {
    if (onKey?.(e)) return
    const closes = e.key === 'Escape' || (toggle !== undefined && actionFor(e.code) === toggle)
    if (!closes) return
    e.preventDefault()
    e.stopPropagation()
    if (e.key !== 'Escape') click()
    closePanel()
  }

  return (
    <div ref={box} className={className ? `bag-panel ${className}` : 'bag-panel'} role="dialog" aria-label={label ?? title} onKeyDown={onKeyDown}>
      <div className="bag-head">
        <h2>{title}</h2>
        <span className="bag-count">{count}</span>
        {extra}
        <button type="button" className="bag-close" aria-label="Close" onClick={closePanel}>
          ×
        </button>
      </div>
      {children}
    </div>
  )
}
