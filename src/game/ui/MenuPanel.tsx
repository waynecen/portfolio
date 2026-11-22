import { toggleEdit } from '../house/edit'
import { closePanel, openPanel, toggleMenu } from '../core/interact'
import { ITEMS, useInventory } from '../life/inventory'
import { togglePhoto } from './photo'
import { isTouch } from '../core/quality'
import { useGame } from '../core/store'
import { LineIcon } from './LineIcon'
import { Panel } from './Panel'

// Touch screens: a Start button at the bottom, between the joystick and the A and B buttons, opens
// this menu, which holds what the keyboard reaches with keys (the bag, the log, the
// settings, photo mode, editing the room); a tap of B puts the fishing rod away, as B does on a keyboard. It
// keeps the top of the screen clear on a phone: the chips that do these things on a computer are
// hidden on touch screens (style.css).

export function MenuPanel() {
  const open = useGame((s) => s.panel === 'menu')
  const scene = useGame((s) => s.scene)
  const found = useInventory((s) => s.found.length)
  if (!open) return null
  // Close the menu first, then act, so the action isn't blocked by the menu being open.
  const then = (act: () => unknown) => () => {
    closePanel()
    act()
  }

  return (
    <Panel title="Menu" className="menu-panel">
      <ul className="menu-list">
        <li>
          <button type="button" onClick={() => openPanel('inventory')}>
            <LineIcon name="bag" />
            Bag <span className="bag-toggle-count">{found} of {ITEMS.length}</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openPanel('log')}>
            <LineIcon name="log" />
            Log
          </button>
        </li>
        <li>
          <button type="button" onClick={then(togglePhoto)}>
            <LineIcon name="camera" />
            Photo
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openPanel('settings')}>
            <LineIcon name="gear" />
            Settings
          </button>
        </li>
        {scene === 'house' && (
          <li>
            <button type="button" onClick={then(toggleEdit)}>
              <LineIcon name="chair" />
              Edit room
            </button>
          </li>
        )}
      </ul>
    </Panel>
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
