import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { FISH, useFishing } from './fishing'
import { closePanel } from './interact'
import { ITEM, ITEMS, toggleBag, useInventory, type ItemId } from './inventory'
import { isTouch } from './quality'
import { useGame } from './store'

// The bag: a slot for every item, filled once it's found, then one for every kind of fish, filled
// once one's caught (fishing.ts), and the chosen slot's name and words below. Arrow keys move
// between slots, across both grids; B, Escape or × closes it.

const COLUMNS = 3 // slots per row; matches .bag-slots in style.css. Keep ITEMS a multiple of it, so arrows go straight down into the fish.

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

/** Every fish gets the same shape, in its own colour. */
function FishIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="bag-icon">
      <path d="M2.5 12c3-5.5 9.5-6.5 13.5-2.5l5.5-4v13l-5.5-4c-4 4-10.5 3-13.5-2.5Z" fill={color} />
      <path d="M9.5 8.2c.8 2.4.8 5.2 0 7.6" stroke="#000" strokeOpacity=".2" fill="none" />
      <circle cx="6.5" cy="11" r="1.2" fill="#2b2b2b" />
    </svg>
  )
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
  const caught = useFishing((s) => s.caught)
  const [chosen, setChosen] = useState<number>(0)
  const slots = useRef<(HTMLButtonElement | null)[]>([])
  const total = ITEMS.length + FISH.length // items first, then fish

  // On opening, choose the first thing in the bag (or the first slot) and move keyboard focus to it.
  useEffect(() => {
    if (!open) return
    const item = ITEMS.findIndex((t) => found.includes(t.id))
    const fish = FISH.findIndex((f) => caught[f.id])
    const first = item >= 0 ? item : fish >= 0 ? ITEMS.length + fish : 0
    setChosen(first)
    slots.current[first]?.focus()
  }, [open]) // only on opening, so picking a slot isn't undone

  if (!open) return null
  const fishCount = FISH.filter((f) => caught[f.id]).length

  // The chosen slot's words.
  let title: string
  let words: string
  if (chosen < ITEMS.length) {
    const item = ITEMS[chosen]
    const has = found.includes(item.id)
    title = has ? item.name : '???'
    words = has ? item.description : 'Still out there somewhere on the island.'
  } else {
    const fish = FISH[chosen - ITEMS.length]
    const got = caught[fish.id]
    title = got ? fish.name : '???'
    words = got
      ? `${fish.description} Caught ${got.count === 1 ? 'once' : `${got.count} times`}; the biggest was ${got.best} cm.`
      : 'Not caught yet. Try the ripples off the dock.'
  }

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
    if (n < 0 || n >= total) return
    setChosen(n)
    slots.current[n]?.focus()
  }

  const slot = (k: number, label: string, filled: boolean, icon: ReactNode) => (
    <li key={k}>
      <button
        ref={(el) => {
          slots.current[k] = el
        }}
        type="button"
        className="bag-slot"
        aria-label={label}
        aria-pressed={k === chosen}
        data-empty={filled ? undefined : ''}
        onClick={() => setChosen(k)}
        onFocus={() => setChosen(k)}
      >
        {filled ? icon : <span aria-hidden="true">?</span>}
      </button>
    </li>
  )

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
          return slot(k, got ? t.name : 'Not found yet', got, <Icon id={t.id} />)
        })}
      </ul>
      <div className="bag-head bag-subhead">
        <h3>Fish</h3>
        <span className="bag-count">
          {fishCount} of {FISH.length} caught
        </span>
      </div>
      <ul className="bag-slots">
        {FISH.map((f, n) => {
          const got = caught[f.id]
          return slot(ITEMS.length + n, got ? f.name : 'Not caught yet', !!got, <FishIcon color={f.color} />)
        })}
      </ul>
      <div className="bag-detail" aria-live="polite">
        <h3>{title}</h3>
        <p>{words}</p>
      </div>
    </div>
  )
}

/** The Bag chip at the top right, under the view toggle. Hidden while something else has the player's attention. */
export function BagButton() {
  const away = useGame((s) => s.dialogue !== null || s.panel !== null || s.fading || s.editing)
  const fishing = useFishing((s) => s.phase !== 'idle')
  const hidden = away || fishing
  const count = useInventory((s) => s.found.length)
  if (hidden) return null
  return (
    <button type="button" className="bag-toggle" onClick={toggleBag} aria-label={`Bag, ${count} of ${ITEMS.length} found`}>
      {!isTouch && <kbd>B</kbd>} Bag <span className="bag-toggle-count">{count}</span>
    </button>
  )
}
