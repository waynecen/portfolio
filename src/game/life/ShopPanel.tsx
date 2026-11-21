import { useEffect, useState } from 'react'
import { useShells } from '../combat/drops'
import { useOwned } from '../house/room'
import { buyHat, buyMap, buyPiece, canAfford, DECOR, HATS, MAP_PRICE, useHats, useTreasureMap, wearHat } from './shop'
import { useGame } from '../core/store'
import { Panel } from '../ui/Panel'

// Pip's shop (shop.ts): hats to wear and furniture for the house, paid for in shells. Opened by
// talking to Pip at the stall east of the house; Escape or × closes it.

export function ShopPanel() {
  const open = useGame((s) => s.panel === 'shop')
  const shells = useShells((s) => s.shells)
  const hats = useHats()
  const owned = useOwned((s) => s.owned)
  const map = useTreasureMap((s) => s.owned)
  const [note, setNote] = useState('Hats and things for the house. What’ll it be?')

  useEffect(() => {
    if (!open) return
    setNote('Hats and things for the house. What’ll it be?')
  }, [open])

  if (!open) return null
  const short = (price: number) => `${price - shells} more ${price - shells === 1 ? 'shell' : 'shells'} needed.`

  return (
    <Panel title="Pip’s shop" count={`${shells} ${shells === 1 ? 'shell' : 'shells'}`} className="shop-panel">
      <p className="shop-note" aria-live="polite">
        {note}
      </p>
      <div className="bag-head bag-subhead">
        <h3>Hats</h3>
      </div>
      <ul className="shop-list">
        {HATS.map((h) => {
          const have = hats.owned.includes(h.id)
          const on = hats.worn === h.id
          return (
            <li key={h.id}>
              <span className="shop-swatch" style={{ background: h.color }} aria-hidden="true" />
              <span className="shop-name">{h.name}</span>
              <button
                type="button"
                onClick={() => {
                  if (have) wearHat(on ? null : h.id)
                  else if (buyHat(h.id)) setNote(`Looks good on you! The ${h.name.toLowerCase()} is yours.`)
                  else setNote(short(h.price))
                }}
              >
                {have ? (on ? 'Take off' : 'Wear') : `${h.price} shells`}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="bag-head bag-subhead">
        <h3>For the house</h3>
      </div>
      <ul className="shop-list">
        {DECOR.map((p) => {
          const have = owned.includes(p.id)
          const name = p.name.replace(/^the /, '')
          return (
            <li key={p.id}>
              <span className="shop-name">{name[0].toUpperCase() + name.slice(1)}</span>
              <button
                type="button"
                disabled={have}
                onClick={() => {
                  if (buyPiece(p.id)) setNote(`I’ve sent ${p.name} up to your house. Move it wherever you like.`)
                  else setNote(canAfford(p.price!) ? 'There’s no room for it in your house just now.' : short(p.price!))
                }}
              >
                {have ? 'In your house' : `${p.price} shells`}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="bag-head bag-subhead">
        <h3>Odds and ends</h3>
      </div>
      <ul className="shop-list">
        <li>
          <span className="shop-name">Treasure map</span>
          <button
            type="button"
            disabled={map}
            onClick={() => {
              if (buyMap()) setNote('X marks the spot! Every buried thing on the island shows as a red cross now.')
              else setNote(short(MAP_PRICE))
            }}
          >
            {map ? 'In your bag' : `${MAP_PRICE} shells`}
          </button>
        </li>
      </ul>
      <p className="settings-note">Shells turn up in tall grass, pots and the odd slime, and buried in the day’s dig spot.</p>
    </Panel>
  )
}
