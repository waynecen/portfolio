import { useEffect, useRef } from 'react'
import { hint } from '../core/keymap'
import { useSettings } from '../core/settings'
import { useGame } from '../core/store'
import { aim, canPickUp, leave, pickUp, useGolf } from './golf'
import { HOLES } from './holes'
import { RoundPanel } from './RoundPanel'

// The mini golf's HUD (golf.ts): a small scorecard at the top while the player is by the green, and
// while lining up a putt, how to putt, a Step away button and the power meter (in the reel's look).

export function GolfHud() {
  const { hole, strokes, best, near, phase, charging, round } = useGolf()
  const offer = useGolf(canPickUp)
  const assist = useSettings((s) => s.golfAssist)
  const putting = useGame((s) => s.putting)
  const outdoors = useGame((s) => s.scene === 'world')
  const fill = useRef<HTMLDivElement>(null)

  // While lining up, the joystick and buttons step aside for the drag (golf.css).
  useEffect(() => {
    document.body.toggleAttribute('data-putting', putting)
    return () => document.body.removeAttribute('data-putting')
  }, [putting])

  // The meter follows the charge, outside React.
  useEffect(() => {
    if (!charging) return
    let raf = 0
    const tick = () => {
      if (fill.current) fill.current.style.width = `${Math.round(aim.power * 100)}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [charging])

  if ((!near || !outdoors) && !putting) return <RoundPanel />
  const h = HOLES[hole]
  // The round so far, against the par of the holes played.
  let total = 0
  let par = 0
  round.forEach((n, k) => {
    if (n === null) return
    total += n
    par += HOLES[k].par
  })
  return (
    <>
      <RoundPanel />
      <p className="golf-card" aria-live="polite">
        Hole {hole + 1} · {h.name} · Par {h.par}
        <span className="golf-strokes">{phase === 'sunk' ? 'In!' : `Stroke ${strokes + (phase === 'aim' ? 1 : 0)}`}</span>
        {best[hole] !== null && <span className="golf-best">Best {best[hole]}</span>}
        {par > 0 && <span className="golf-best">Round {total - par === 0 ? 'E' : total - par > 0 ? `+${total - par}` : total - par}</span>}
        {/* The assist shows while it's on, like the fishing prompt's (settings.ts). */}
        {assist && <span className="golf-best">Assist on</span>}
        {offer && (
          <button type="button" className="golf-pickup" onClick={pickUp}>
            Pick it up
          </button>
        )}
      </p>
      {putting && (
        <div className="reel golf-putt">
          <p className="reel-title">
            {charging ? 'Let go to putt' : hint('{left} {right} to aim · hold {attack} to charge, or drag back with the mouse', 'Drag back from anywhere and let go')}
          </p>
          <div className="golf-meter" aria-hidden="true">
            <div ref={fill} className="golf-meter-fill" />
          </div>
          <button type="button" className="golf-leave" onClick={leave}>
            Step away{hint(' ({interact})', '')}
          </button>
        </div>
      )}
    </>
  )
}
