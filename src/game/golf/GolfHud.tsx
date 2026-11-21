import { useEffect, useRef } from 'react'
import { hint } from '../core/keymap'
import { useGame } from '../core/store'
import { aim, leave, useGolf } from './golf'
import { HOLES } from './holes'

// The mini golf's HUD (golf.ts): a small scorecard at the top while the player is by the green, and
// while lining up a putt, how to putt, a Step away button and the power meter (in the reel's look).

export function GolfHud() {
  const { hole, strokes, best, near, phase, charging } = useGolf()
  const putting = useGame((s) => s.putting)
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

  if (!near && !putting) return null
  const h = HOLES[hole]
  return (
    <>
      <p className="golf-card" aria-live="polite">
        Hole {hole + 1} · {h.name} · Par {h.par}
        <span className="golf-strokes">{phase === 'sunk' ? 'In!' : `Stroke ${strokes + (phase === 'aim' ? 1 : 0)}`}</span>
        {best[hole] !== null && <span className="golf-best">Best {best[hole]}</span>}
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
