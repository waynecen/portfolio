import { useEffect, useRef } from 'react'
import { toggleEdit } from './edit'
import { pointMe } from './guide'
import { closePanel, openPanel, toggleMenu } from './interact'
import { ITEMS, useInventory } from './inventory'
import { togglePhoto } from './photo'
import { isTouch } from './quality'
import { useGame } from './store'

// Touch screens: a Start button at the bottom, between the joystick and the A and B buttons, opens
// this menu, which holds what the keyboard reaches with keys (the bag, Where to?, the log, the
// settings, photo mode, editing the room); a tap of B puts the fishing rod away, as B does on a keyboard. It
// keeps the top of the screen clear on a phone: the chips that do these things on a computer are
// hidden on touch screens (style.css).

export function MenuPanel() {
  const open = useGame((s) => s.panel === 'menu')
  const scene = useGame((s) => s.scene)
  const found = useInventory((s) => s.found.length)
  const first = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) first.current?.focus()
  }, [open])

  if (!open) return null
  // Close the menu first, then act, so the action isn't blocked by the menu being open.
  const then = (act: () => unknown) => () => {
    closePanel()
    act()
  }

  return (
    <div className="bag-panel menu-panel" role="dialog" aria-label="Menu">
      <div className="bag-head">
        <h2>Menu</h2>
        <span className="bag-count" />
        <button type="button" className="bag-close" aria-label="Close" onClick={closePanel}>
          ×
        </button>
      </div>
      <ul className="menu-list">
        <li>
          <button ref={first} type="button" onClick={() => openPanel('inventory')}>
            Bag <span className="bag-toggle-count">{found} of {ITEMS.length}</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={then(pointMe)}>
            Where to?
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openPanel('log')}>
            Log
          </button>
        </li>
        <li>
          <button type="button" onClick={then(togglePhoto)}>
            Photo
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openPanel('settings')}>
            Settings
          </button>
        </li>
        {scene === 'house' && (
          <li>
            <button type="button" onClick={then(toggleEdit)}>
              Edit room
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}

/** The Start button (touch screens only): opens the menu, or closes whatever panel is open. */
export function StartButton() {
  const hidden = useGame((s) => s.dialogue !== null || s.fading || s.editing)
  const open = useGame((s) => s.panel !== null)
  if (!isTouch || hidden) return null
  return (
    <button type="button" className="start-button" aria-label={open ? 'Close' : 'Menu'} onClick={toggleMenu}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {open ? (
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        ) : (
          <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        )}
      </svg>
    </button>
  )
}
