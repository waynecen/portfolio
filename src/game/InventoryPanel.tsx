import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { closePanel } from './interact'
import { ITEM, ITEMS, toggleBag, useInventory, type ItemId } from './inventory'
import { isTouch } from './quality'
import { useGame } from './store'

// The bag: a slot for every item, filled once it's found, and the chosen item's name and words
// below. Arrow keys move between slots; B, Escape or × closes it.

const COLUMNS = 3 // slots per row; matches .bag-slots in style.css

// A small picture of each item on a 24 × 24 grid, in its colour (`c`).
const ICONS: Record<ItemId, (c: string) => ReactNode> = {
  shell: (c) => (
    <>
      <path d="M12 21 3.5 9.5a9.5 9.5 0 0 1 17 0Z" fill={c} />
      <path d="M12 21 7 6M12 21V4.5M12 21l5-15M12 21 4 10M12 21l8-11" stroke="#7a6449" strokeOpacity=".35" fill="none" />
    </>
  ),
  seaGlass: (c) => <path d="M12 2.5 19 11l-7 10.5L5 11Z" fill={c} />,
  pineCone: (c) => (
    <>
      <ellipse cx="12" cy="13" rx="6" ry="8.5" fill={c} />
      <path d="M7 10.5h10M6.2 14h11.6M7.2 17.5h9.6M9 7h6" stroke="#4a3220" strokeOpacity=".4" fill="none" />
      <path d="M12 4.5V2" stroke="#4a3220" strokeWidth="1.6" />
    </>
  ),
  coin: (c) => (
    <>
      <circle cx="12" cy="12" r="8.5" fill={c} />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#7a6449" strokeOpacity=".4" strokeWidth="1.2" />
    </>
  ),
  feather: (c) => (
    <>
      <path d="M19 3C10 5 5.5 12 6 20c6-2 12-8 13-17Z" fill={c} />
      <path d="M4.5 21.5 17 5.5" stroke="#3b5f99" strokeWidth="1.3" />
    </>
  ),
  key: (c) => (
    <>
      <circle cx="7.5" cy="8" r="4.2" fill="none" stroke={c} strokeWidth="2.6" />
      <path d="M10.5 11 19.5 20M15.5 16l2.5-2.5M18 18.5l2-2" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
}

function Icon({ id }: { id: ItemId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="bag-icon">
      {ICONS[id](ITEM[id].color)}
    </svg>
  )
}

/** The bag, opened with B or the Bag chip. */
export function InventoryPanel() {
  const open = useGame((s) => s.panel === 'inventory')
  const found = useInventory((s) => s.found)
  const [chosen, setChosen] = useState<number>(0)
  const slots = useRef<(HTMLButtonElement | null)[]>([])

  // On opening, choose the first item found (or the first slot) and move keyboard focus to it.
  useEffect(() => {
    if (!open) return
    const first = Math.max(0, ITEMS.findIndex((t) => found.includes(t.id)))
    setChosen(first)
    slots.current[first]?.focus()
  }, [open]) // only on opening, so picking a slot isn't undone

  if (!open) return null
  const item = ITEMS[chosen]
  const has = found.includes(item.id)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.code === 'KeyB') {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'KeyB') toggleBag()
      else closePanel()
      return
    }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLUMNS, ArrowDown: COLUMNS }[e.key]
    if (step === undefined) return
    e.preventDefault()
    const n = chosen + step
    if (n < 0 || n >= ITEMS.length) return
    setChosen(n)
    slots.current[n]?.focus()
  }

  return (
    <div className="bag-panel" role="dialog" aria-label="Bag" onKeyDown={onKeyDown}>
      <div className="bag-head">
        <h2>Bag</h2>
        <span className="bag-count">
          {found.length} of {ITEMS.length} found
        </span>
        <button type="button" className="bag-close" aria-label="Close" onClick={closePanel}>
          ×
        </button>
      </div>
      <ul className="bag-slots">
        {ITEMS.map((t, k) => {
          const got = found.includes(t.id)
          return (
            <li key={t.id}>
              <button
                ref={(el) => {
                  slots.current[k] = el
                }}
                type="button"
                className="bag-slot"
                aria-label={got ? t.name : 'Not found yet'}
                aria-pressed={k === chosen}
                data-empty={got ? undefined : ''}
                onClick={() => setChosen(k)}
                onFocus={() => setChosen(k)}
              >
                {got ? <Icon id={t.id} /> : <span aria-hidden="true">?</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="bag-detail" aria-live="polite">
        <h3>{has ? item.name : '???'}</h3>
        <p>{has ? item.description : 'Still out there somewhere on the island.'}</p>
      </div>
    </div>
  )
}

/** The Bag chip at the top right, under the view toggle. Hidden while something else has the player's attention. */
export function BagButton() {
  const hidden = useGame((s) => s.dialogue !== null || s.panel !== null || s.fading || s.editing)
  const count = useInventory((s) => s.found.length)
  if (hidden) return null
  return (
    <button type="button" className="bag-toggle" onClick={toggleBag} aria-label={`Bag, ${count} of ${ITEMS.length} found`}>
      {!isTouch && <kbd>B</kbd>} Bag <span className="bag-toggle-count">{count}</span>
    </button>
  )
}
