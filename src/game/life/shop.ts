import { create } from 'zustand'
import { addShells, useShells } from '../drops'
import { pickup } from '../core/sfx'
import { addPiece, PIECES, useOwned, type PieceId } from '../house/room'

// The shop at Pip's stall, east of the house (ShopPanel.tsx; the stall and Pip in Villagers.tsx):
// shells (drops.ts) buy hats to wear and furniture for the house, which arrives in the room and
// can be moved like the rest (edit mode), and a treasure map that marks where to dig.
// Everything bought is kept in this browser.

export type HatId = 'straw' | 'party' | 'beanie' | 'crown'
export type Hat = { id: HatId; name: string; price: number; color: string }

/** The hats for sale, cheapest first. Placeholders: change names and prices freely. */
export const HATS: Hat[] = [
  { id: 'straw', name: 'Straw hat', price: 5, color: '#e3c27a' },
  { id: 'party', name: 'Party hat', price: 8, color: '#e0566a' },
  { id: 'beanie', name: 'Woolly hat', price: 12, color: '#4a7fb5' },
  { id: 'crown', name: 'Little crown', price: 30, color: '#f2b233' },
]

/** The furniture for sale: every room piece with a price (room.ts). */
export const DECOR = PIECES.filter((p) => p.price)

const KEY = 'hats-v1'
type HatState = { owned: HatId[]; worn: HatId | null }
function load(): HatState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<HatState>
    const ids = HATS.map((h) => h.id)
    const owned = Array.isArray(v.owned) ? ids.filter((id) => v.owned!.includes(id)) : []
    return { owned, worn: v.worn && owned.includes(v.worn) ? v.worn : null }
  } catch {
    return { owned: [], worn: null }
  }
}
/** Hats owned, and the one being worn (Hat.tsx draws it). */
export const useHats = create<HatState>(() => load())
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(useHats.getState()))
  } catch {
    // private mode or storage full: kept until the page closes
  }
}

/** True if there are enough shells for `price`. */
export const canAfford = (price: number) => useShells.getState().shells >= price

/** Buys a hat and puts it on. False if it can't be afforded (or is already owned). */
export function buyHat(id: HatId): boolean {
  const hat = HATS.find((h) => h.id === id)!
  const s = useHats.getState()
  if (s.owned.includes(id) || !canAfford(hat.price)) return false
  addShells(-hat.price)
  useHats.setState({ owned: [...s.owned, id], worn: id })
  save()
  pickup()
  return true
}

/** Puts on a hat already owned, or takes the hat off (null). */
export function wearHat(id: HatId | null) {
  if (id && !useHats.getState().owned.includes(id)) return
  useHats.setState({ worn: id })
  save()
}

/** The treasure map's price. With it, every buried pearl (pearls.ts) and the day's dig spot shows as a red cross. */
export const MAP_PRICE = 15
const MAP_KEY = 'map-v1'
function loadMap() {
  try {
    return localStorage.getItem(MAP_KEY) === '1'
  } catch {
    return false
  }
}
/** Whether the treasure map has been bought. */
export const useTreasureMap = create<{ owned: boolean }>(() => ({ owned: loadMap() }))

/** Buys the treasure map. False if it can't be afforded (or is already owned). */
export function buyMap(): boolean {
  if (useTreasureMap.getState().owned || !canAfford(MAP_PRICE)) return false
  addShells(-MAP_PRICE)
  useTreasureMap.setState({ owned: true })
  try {
    localStorage.setItem(MAP_KEY, '1')
  } catch {
    // private mode or storage full: kept until the page closes
  }
  pickup()
  return true
}

/** Buys a piece of furniture: it appears in the house. False if it can't be afforded or won't fit. */
export function buyPiece(id: PieceId): boolean {
  const piece = DECOR.find((p) => p.id === id)
  if (!piece?.price || useOwned.getState().owned.includes(id) || !canAfford(piece.price)) return false
  if (!addPiece(id)) return false
  addShells(-piece.price)
  pickup()
  return true
}
