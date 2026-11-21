import { toggleEdit } from '../house/edit'
import { closePanel, openPanel, toggleMenu } from '../core/interact'
import { ITEMS, useInventory } from '../life/inventory'
import { togglePhoto } from './photo'
import { isTouch } from '../core/quality'
import { useGame } from '../core/store'
import { Panel } from './Panel'

// Touch screens: a Start button at the bottom, between the joystick and the A and B buttons, opens
// this menu, which holds what the keyboard reaches with keys (the bag, the log, the
// settings, photo mode, editing the room); a tap of B puts the fishing rod away, as B does on a keyboard. It
// keeps the top of the screen clear on a phone: the chips that do these things on a computer are
// hidden on touch screens (style.css).

// A small line drawing beside each item, in the text's colour.
const ICONS = {
  bag: 'M6 9h12l-1 11H7L6 9Zm3 0V7a3 3 0 0 1 6 0v2',
  log: 'M7 4h10v16H7zM10 8h4M10 12h4M10 16h2',
  camera: 'M4 8h4l1.5-2h5L16 8h4v11H4V8Zm8 2.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1',
  chair: 'M7 4v16M7 12h10v8M7 12V4h8v8M17 12v8',
}
function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
            <Icon name="bag" />
            Bag <span className="bag-toggle-count">{found} of {ITEMS.length}</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openPanel('log')}>
            <Icon name="log" />
            Log
          </button>
        </li>
        <li>
          <button type="button" onClick={then(togglePhoto)}>
            <Icon name="camera" />
            Photo
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openPanel('settings')}>
            <Icon name="gear" />
            Settings
          </button>
        </li>
        {scene === 'house' && (
          <li>
            <button type="button" onClick={then(toggleEdit)}>
              <Icon name="chair" />
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
