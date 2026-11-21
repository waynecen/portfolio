import { create } from 'zustand'
import { closePanel, busy, openPanel, say } from '../core/interact'
import { chime, click } from '../core/sfx'
import { useGame } from '../core/store'
import { readSaved, writeSaved } from '../core/persist'
import { hint } from '../core/keymap'

// The bag: small things to find around the island. Each item waits at its spot (Pickups.tsx) until
// the player picks it up; then it's in the bag (InventoryPanel.tsx) for good, saved in this browser.
// Opened with B, or the Bag chip at the top of the screen (Bag in the menu on touch screens).

export type ItemId = 'shell' | 'seaGlass' | 'pineCone' | 'coin' | 'feather' | 'key'

export type Item = {
  id: ItemId
  name: string
  description: string
  /** Its colour, in the world and on its icon in the bag. */
  color: string
  /** The tile it waits on. If a tree, road or place is there, it moves to the nearest clear tile (Pickups.tsx). */
  at: { i: number; j: number }
}

/** Every item, in the order the bag lists them. Placeholders: change names, words and spots freely. */
export const ITEMS: Item[] = [
  { id: 'shell', name: 'Spiral shell', description: 'Hold it to your ear and you can hear the sea. Or the wind. Hard to say.', color: '#f2b8b0', at: { i: 9, j: 9 } },
  { id: 'seaGlass', name: 'Sea glass', description: 'A bottle, once. The waves have worn it smooth and frosted.', color: '#7fd6c8', at: { i: -11, j: 6 } },
  { id: 'pineCone', name: 'Pine cone', description: 'Fell from one of the tall pines. It still smells of resin.', color: '#9a6a42', at: { i: -17, j: -13 } },
  { id: 'coin', name: 'Old coin', description: 'Too worn to read the date. Someone was here long ago.', color: '#e8b84a', at: { i: 12, j: -4 } },
  { id: 'feather', name: 'Blue feather', description: 'Dropped by a bird that never sits still long enough to be seen.', color: '#6f9bd1', at: { i: 3, j: 13 } },
  { id: 'key', name: 'Brass key', description: "It doesn't fit the front door. What does it open?", color: '#d9a441', at: { i: 5, j: -12 } },
]
export const ITEM = Object.fromEntries(ITEMS.map((t) => [t.id, t])) as Record<ItemId, Item>

const SAVE_KEY = 'inventory-v1'

function load(): ItemId[] {
  const saved: unknown = (readSaved(SAVE_KEY) ?? [])
  return Array.isArray(saved) ? ITEMS.filter((t) => saved.includes(t.id)).map((t) => t.id) : []
}

/** Items found so far, in the order of ITEMS. */
export const useInventory = create<{ found: ItemId[] }>(() => ({ found: load() }))

/** Puts `id` in the bag and says what it is. */
export function collect(id: ItemId) {
  const { found } = useInventory.getState()
  if (found.includes(id)) return
  const next = ITEMS.filter((t) => t.id === id || found.includes(t.id)).map((t) => t.id)
  useInventory.setState({ found: next })
  writeSaved(SAVE_KEY, next)
  chime()
  const item = ITEM[id]
  const lines = [`You found the ${item.name.toLowerCase()}! ${item.description}`]
  if (next.length === 1) lines.push(hint('Press {bag} to look in your bag.', 'Tap the menu button at the bottom, then Bag, to see what you’ve found.'))
  if (next.length === ITEMS.length) lines.push('That’s everything! Your bag is full.')
  say(lines)
}

/** B: opens the bag, or closes it if it's open. */
export function toggleBag() {
  const s = useGame.getState()
  if (s.panel === 'inventory') {
    click()
    closePanel()
  } else if (!busy()) {
    click()
    openPanel('inventory')
  }
}
