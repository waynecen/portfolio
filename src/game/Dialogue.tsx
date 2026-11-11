import { useEffect, useRef } from 'react'
import { advance, typer } from './interact'
import { isTouch } from './quality'
import { useGame } from './store'

const CHARS_PER_SECOND = 40
const PAUSE_SENTENCE = 0.25 // extra seconds after . ! ?
const PAUSE_COMMA = 0.1 // extra seconds after , ; :
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const KEY = isTouch ? 'A' : 'E'

// Seconds to wait after typing `ch` before the next letter.
function delayAfter(ch: string) {
  const base = 1 / CHARS_PER_SECOND
  if (ch === '.' || ch === '!' || ch === '?') return base + PAUSE_SENTENCE
  if (ch === ',' || ch === ';' || ch === ':') return base + PAUSE_COMMA
  return base
}

/** The dialogue bubble: pops in, types each line out, advanced with E / Enter / Space / A or a tap. */
export function Dialogue() {
  const d = useGame((s) => s.dialogue)
  const line = d ? d.lines[d.index] : ''
  const index = d ? d.index : -1
  const box = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLSpanElement>(null)

  // Typewriter: writes straight to the DOM node, so React renders once per line, not per letter.
  useEffect(() => {
    const el = text.current
    const bubble = box.current
    if (!d || !el || !bubble) return
    let n = reduced ? line.length : 0
    let raf = 0
    let due = performance.now()
    const show = () => {
      el.textContent = line.slice(0, n)
      typer.done = n >= line.length
      if (typer.done) bubble.dataset.done = ''
      else delete bubble.dataset.done
    }
    const tick = (t: number) => {
      const before = n
      while (n < line.length && t >= due) {
        due += delayAfter(line[n]) * 1000
        n++
      }
      if (n !== before) show()
      if (n < line.length) raf = requestAnimationFrame(tick)
    }
    typer.finish = () => {
      cancelAnimationFrame(raf)
      n = line.length
      show()
    }
    // A little squash between lines (the first line gets the CSS pop-in instead).
    if (index > 0 && !reduced) {
      bubble.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.03, 0.95)' }, { transform: 'scale(1)' }],
        { duration: 180, easing: 'ease-out' },
      )
    }
    show()
    if (n < line.length) raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      typer.done = true
    }
  }, [d, line, index])

  return (
    <div className="dialogue-region">
      {/* Screen readers get the whole line at once instead of every typed letter. */}
      <p className="sr-only" aria-live="polite">{line}</p>
      {d && (
        <div ref={box} className="dialogue" aria-hidden="true" title={`${KEY} to continue`} onClick={() => advance()}>
          {/* Wobbly cloud outline, stretched to fit the text. */}
          <svg className="dialogue-cloud" viewBox="0 0 400 130" preserveAspectRatio="none">
            <path d="M40 14C90 3 150 11 200 7S320 9 360 12C392 15 399 40 393 62S399 101 384 116C360 131 300 121 250 125S118 122 70 126C30 129 6 112 10 90S1 50 8 34C14 18 26 15 40 14Z" />
          </svg>
          <p className="dialogue-text">
            <span ref={text} />
          </p>
          <svg className="dialogue-next" viewBox="0 0 20 12">
            <path d="M2 2h16L10 11Z" />
          </svg>
        </div>
      )}
    </div>
  )
}

/** "E Read" chip for focused interactables that don't show a project card. */
export function Prompt() {
  const focus = useGame((s) => s.focus)
  const talking = useGame((s) => s.dialogue !== null || s.panel !== null)
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
