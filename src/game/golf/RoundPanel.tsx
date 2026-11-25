import { useGame } from '../core/store'
import { Panel } from '../ui/Panel'
import { closePanel } from '../core/interact'
import { useGolf } from './golf'
import { HOLES } from './holes'

// The end of a round (golf.ts opens it after the last hole): each hole's strokes against its par,
// the round's total, the best round, and the trophy the first time it's under par. Kind words
// whatever the score; Escape, × or Play again closes it, and the next round is already on hole 1.

const vsPar = (n: number) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`)

export function RoundPanel() {
  const open = useGame((s) => s.panel === 'golf')
  const card = useGolf((s) => s.card)
  if (!open || !card) return null
  const words =
    card.vs < 0 ? `${-card.vs} under par.` : card.vs === 0 ? 'Level par.' : `${card.vs} over par. Every round's a good walk.`
  return (
    <Panel title="Gull Rock Links" count="round done" className="golf-round">
      <table className="golf-table">
        <thead>
          <tr>
            <th scope="col">Hole</th>
            <th scope="col">Par</th>
            <th scope="col">Strokes</th>
            <th scope="col">
              <span className="sr-only">Against par</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {HOLES.map((h, k) => {
            const n = card.holes[k]
            return (
              <tr key={h.name} data-under={n.strokes < h.par ? '' : undefined} data-one={n.strokes === 1 && !n.picked ? '' : undefined}>
                <th scope="row">
                  {k + 1} · {h.name}
                </th>
                <td>{h.par}</td>
                <td>
                  {n.strokes}
                  {n.picked && <span className="golf-picked"> picked up</span>}
                  {n.strokes === 1 && !n.picked && <span className="golf-picked"> in one!</span>}
                </td>
                <td>{vsPar(n.strokes - h.par)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Round</th>
            <td>{card.total - card.vs}</td>
            <td>{card.total}</td>
            <td>{vsPar(card.vs)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="golf-words">
        {words} {card.newBest ? 'Your best round yet!' : card.best !== null ? `Your best is ${card.best}.` : ''}
      </p>
      {card.trophy && <p className="golf-trophy">A trophy for the house! It's waiting on the mantelpiece at home.</p>}
      <button type="button" className="golf-again" onClick={closePanel}>
        Play again
      </button>
    </Panel>
  )
}
