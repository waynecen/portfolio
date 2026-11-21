import { useEffect, useRef } from 'react'
import { line, reelZone, useFishing } from './fishing'
import { isTouch } from './core/quality'
import { useSettings } from './core/settings'

// The reel (fishing.ts): a bar with a green zone in the middle and a needle the fish tugs back and
// forth. Hold left and right to keep the needle in the green; the meter under it fills while it's
// there and drains while it isn't. Drawn in the HUD; the needle and meter are moved straight on the
// elements each animation frame, so React only renders when reeling starts and stops.

export function ReelBar() {
  const reeling = useFishing((s) => s.phase === 'reel')
  const assist = useSettings((s) => s.fishAssist)
  const needle = useRef<HTMLDivElement>(null)
  const meter = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!reeling) return
    let frame = 0
    const draw = () => {
      const n = line.needle
      if (needle.current) needle.current.style.left = `${50 + n * 50}%`
      if (meter.current) meter.current.style.width = `${Math.max(0, Math.min(1, line.meter)) * 100}%`
      // In the green or not, for the colours.
      if (bar.current) bar.current.toggleAttribute('data-out', Math.abs(n) >= reelZone())
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [reeling])

  if (!reeling) return null
  const zone = reelZone() * 100 // % of half the bar
  const strong = (line.fish?.fight ?? 0) >= 0.6
  return (
    <div className="reel" role="status" aria-label="Reeling in">
      <p className="reel-title">{strong ? 'Something big is on the line!' : 'Something’s on the line!'}</p>
      <div ref={bar} className="reel-bar">
        <div className="reel-zone" style={{ left: `${50 - zone / 2}%`, width: `${zone}%` }} />
        <div ref={needle} className="reel-needle" />
      </div>
      <div className="reel-meter">
        <div ref={meter} className="reel-meter-fill" />
      </div>
      <p className="reel-hint">
        {isTouch ? 'Push the joystick left and right' : 'Hold ← → (or A D)'} to keep the needle in the green
        {assist && <span className="prompt-assist">Assist on</span>}
      </p>
    </div>
  )
}
