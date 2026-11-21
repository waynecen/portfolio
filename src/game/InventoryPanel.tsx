import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { BUGS, useBugs } from './bugs'
import { useCave } from './cave'
import { useShells } from './drops'
import { FISH, putAwayRod, SPOTS, useFishing } from './fishing'
import { closePanel, toggleLog } from './interact'
import { ITEM, ITEMS, toggleBag, useInventory, type ItemId } from './inventory'
import { PEARLS, usePearls } from './pearls'
import { isTouch } from './quality'
import { PLACES, useSeen } from './seen'
import { useTreasureMap } from './shop'
import { useGame } from './store'

// The bag: a slot for every item, filled once it's found, then one for every kind of fish, filled
// once one's caught (fishing.ts), and the chosen slot's name and words below. Arrow keys move
// between slots, across both grids; B, Escape or × closes it.

// Slots per row: 3, or 6 on touch screens, where the bag is condensed to fit between the HUD and
// the touch controls. Matches .bag-slots in style.css (same media query). Keep ITEMS a multiple of
// both, so arrows go straight down into the fish.
const COLUMNS = matchMedia('(pointer: coarse)').matches ? 6 : 3

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

/** Every bug gets the same shape, wings spread, in its own colour. */
function BugIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="bag-icon">
      <path d="M12 12C9 5 3.5 4 3.5 8.5S8 15 12 12Zm0 0c3-7 8.5-8 8.5-3.5S16 15 12 12Zm0 0c-2.5 2-6 3-6 6s4-1 6-6Zm0 0c2.5 2 6 3 6 6s-4-1-6-6Z" fill={color} stroke="#7a6449" strokeOpacity=".5" />
      <path d="M12 7.5v10" stroke="#3b3027" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
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
  const bugs = useBugs((s) => s.caught)
  const seen = useSeen((s) => s.seen)
  const shells = useShells((s) => s.shells)
  const pearls = usePearls((s) => s.found.length)
  const map = useTreasureMap((s) => s.owned)
  // Things that open the way or show it, as chips under the pearls.
  const key = useCave((s) => s.key === 'held')
  const oar = useCave((s) => s.oar)
  const treasures = [map && 'Treasure map', key && 'Small key', oar && 'Oar'].filter(Boolean) as string[]
  const [chosen, setChosen] = useState<number>(0)
  const slots = useRef<(HTMLButtonElement | null)[]>([])
  const total = ITEMS.length + FISH.length + BUGS.length // items first, then fish, then bugs

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
  } else if (chosen >= ITEMS.length + FISH.length) {
    const bug = BUGS[chosen - ITEMS.length - FISH.length]
    const got = bugs[bug.id]
    title = got ? bug.name : '???'
    words = got
      ? `${bug.description} Caught ${got === 1 ? 'once' : `${got} times`}.`
      : 'Not caught yet. Butterflies come out on dry days; fireflies at night.'
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
          {found.length} of {ITEMS.length} found · {shells} {shells === 1 ? 'shell' : 'shells'}
        </span>
        <button type="button" className="bag-log" onClick={toggleLog}>
          {!isTouch && <kbd>L</kbd>} Log
        </button>
        <button type="button" className="bag-close" aria-label="Close" onClick={closePanel}>
          ×
        </button>
      </div>
      {/* Places seen (seen.ts): every project, the About sign and the Contact mailbox, ticked once looked at. */}
      <div className="bag-head bag-subhead">
        <h3>Places</h3>
        <span className="bag-count">
          {PLACES.filter((p) => p.kind === 'project' && seen.includes(p.id)).length} of{' '}
          {PLACES.filter((p) => p.kind === 'project').length} projects seen
        </span>
      </div>
      <ul className="bag-places">
        {PLACES.map((p) => {
          const been = seen.includes(p.id)
          return (
            <li key={p.id} data-seen={been ? '' : undefined}>
              <span aria-hidden="true">{been ? '✓' : '○'}</span> {p.name}
              <span className="sr-only">{been ? ', seen' : ', not seen yet'}</span>
            </li>
          )
        })}
      </ul>
      {/* Pearls (pearls.ts): one dot each, filled once found. */}
      <div className="bag-head bag-subhead">
        <h3>Pearls</h3>
        <span className="bag-count">
          {pearls} of {PEARLS.length} found
        </span>
      </div>
      <p className="bag-pearls" aria-hidden="true">
        {PEARLS.map((p, k) => (
          <span key={p.id} data-found={k < pearls ? '' : undefined} />
        ))}
      </p>
      {treasures.length > 0 && (
        <ul className="bag-places" aria-label="Treasures">
          {treasures.map((t) => (
            <li key={t} data-seen="">
              {t}
            </li>
          ))}
        </ul>
      )}
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
      <div className="bag-head bag-subhead">
        <h3>Bugs</h3>
        <span className="bag-count">
          {BUGS.filter((b) => bugs[b.id]).length} of {BUGS.length} caught
        </span>
      </div>
      <ul className="bag-slots">
        {BUGS.map((b, n) => {
          const got = !!bugs[b.id]
          return slot(ITEMS.length + FISH.length + n, got ? b.name : 'Not caught yet', got, <BugIcon color={b.color} />)
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

/**
 * The Put away chip, under the Bag chip (or the Edit room chip indoors), while a rod is in hand: the
 * phone's way to do what B does on a keyboard. Hidden by the ripple, where the rod is for fishing,
 * while the line is out, and while something else has the player's attention.
 */
export function RodButton() {
  const away = useGame((s) => s.dialogue !== null || s.panel !== null || s.fading || s.editing)
  const rod = useFishing((s) => s.rod)
  const fishing = useFishing((s) => s.phase !== 'idle')
  const spot = useFishing((s) => SPOTS[s.spot])
  const atSpot = useGame((s) => s.focus !== null && s.focus.x === spot.x && s.focus.z === spot.z)
  if (!rod || away || fishing || atSpot) return null
  return (
    <button type="button" className="rod-toggle" onClick={putAwayRod}>
      {!isTouch && <kbd>B</kbd>} Put away rod
    </button>
  )
}
