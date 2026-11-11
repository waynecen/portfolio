import { useEffect, useRef } from 'react'
import { advance, typer } from './interact'
import { isTouch } from './quality'
import { useGame } from './store'

const CHARS_PER_SECOND = 40
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const KEY = isTouch ? 'A' : 'E'

/** The dialogue box: types each line out, advanced with E / Enter / Space / A or a tap on the box. */
export function Dialogue() {
  const d = useGame((s) => s.dialogue)
  const line = d ? d.lines[d.index] : ''
  const last = d ? d.index === d.lines.length - 1 : false
  const text = useRef<HTMLSpanElement>(null)

  // Typewriter: writes straight to the DOM node, so React renders once per line, not per letter.
  useEffect(() => {
    const el = text.current
    if (!d || !el) return
    let n = reduced ? line.length : 0
    let raf = 0
    const start = performance.now()
    const show = () => {
      el.textContent = line.slice(0, n)
      typer.done = n >= line.length
    }
    const tick = (t: number) => {
      const next = Math.min(line.length, Math.floor(((t - start) / 1000) * CHARS_PER_SECOND))
      if (next !== n) {
        n = next
        show()
      }
      if (n < line.length) raf = requestAnimationFrame(tick)
    }
    typer.finish = () => {
      cancelAnimationFrame(raf)
      n = line.length
      show()
    }
    show()
    if (n < line.length) raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      typer.done = true
    }
  }, [d, line])

  return (
    <div className="dialogue-region">
      {/* Screen readers get the whole line at once instead of every typed letter. */}
      <p className="sr-only" aria-live="polite">{line}</p>
      {d && (
        <div className="dialogue" aria-hidden="true" onClick={() => advance()}>
          <p className="dialogue-text">
            <span ref={text} />
          </p>
          <span className="dialogue-next">
            {KEY} {last ? 'Close' : 'Next'}
          </span>
        </div>
      )}
    </div>
  )
}

/** "E Read" chip for focused interactables that don't show a project card. */
export function Prompt() {
  const focus = useGame((s) => s.focus)
  const talking = useGame((s) => s.dialogue !== null)
  const show = focus && !focus.card && !talking
  return (
    <div className="prompt-region" aria-live="polite">
      {show && (
        <p className="prompt">
          <kbd>{KEY}</kbd> {focus.prompt}
        </p>
      )}
    </div>
  )
}
