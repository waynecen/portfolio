import { useRef, type PointerEvent } from 'react'
import { pressAttack, releaseAttack } from '../combat/combat'
import { putAwayRod, useFishing } from '../life/fishing'
import { buttons, stick } from '../core/input'
import { busy, interact } from '../core/interact'
import { useGame } from '../core/store'
import { isTouch } from '../core/quality'

const TRAVEL = 40 // px the knob can move from center
const DEAD_ZONE = 0.15
const EDGE = 64 // the stick's centre stays this far from the screen's edges (its radius, 56, plus a margin), so it's never cut off

// The stick is hidden until a thumb goes down: it then appears under it, follows the drag, and goes
// again on release. The area it listens on covers the game behind the rest of the HUD (it's mounted
// straight after the canvas, so every button and panel sits above it), and it steps aside where the
// game reads drags itself (edit mode, a putt: touch.css, golf.css).
function Stick() {
  const zone = useRef<HTMLDivElement>(null)
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const centre = useRef({ x: 0, y: 0 })

  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer.current || !knob.current) return
    let dx = e.clientX - centre.current.x
    let dy = e.clientY - centre.current.y
    const len = Math.hypot(dx, dy)
    if (len > TRAVEL) {
      dx *= TRAVEL / len
      dy *= TRAVEL / len
    }
    const active = len > TRAVEL * DEAD_ZONE
    stick.x = active ? dx / TRAVEL : 0
    stick.z = active ? dy / TRAVEL : 0
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  const start = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== null || !zone.current || !base.current) return // one thumb steers
    const r = zone.current.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX, r.left + EDGE), r.right - EDGE)
    const y = Math.min(Math.max(e.clientY, r.top + EDGE), r.bottom - EDGE)
    centre.current.x = x
    centre.current.y = y
    base.current.style.left = `${x - r.left}px`
    base.current.style.top = `${y - r.top}px`
    zone.current.dataset.active = ''
    pointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    move(e)
  }

  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    stick.x = stick.z = 0
    if (knob.current) knob.current.style.transform = ''
    if (zone.current) delete zone.current.dataset.active
  }

  return (
    <div
      ref={zone}
      className="joystick"
      aria-hidden="true"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div ref={base} className="joystick-base">
        <div ref={knob} className="joystick-knob" />
      </div>
    </div>
  )
}

// On touch screens, the area the stick appears in (mounted right after the canvas, under the HUD).
export function TouchStick() {
  return isTouch ? <Stick /> : null
}

// Controller-style A button: talks to / uses whatever is nearby, and with nothing nearby (and no
// dialogue, panel, fishing or putt) swings the sword, like J or a click: the press swings, and holding
// on after it charges a spin, let go on release (combat.ts). Using things acts on the click rather
// than the press, because on touch only the release grants the user activation that opening a
// project in a new tab needs. Pointer capture keeps a held swing tracked if the thumb slides off.
function ActionButton() {
  const pointer = useRef<number | null>(null) // the press that's swinging the sword, if one is
  const swung = useRef(false) // this press swung, so its click doesn't use anything too
  const end = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    releaseAttack()
  }
  return (
    <button
      type="button"
      className="action-button"
      aria-label="Action: talk or open, or swing the sword"
      onPointerDown={(e) => {
        e.preventDefault() // keep focus and the 300ms tap delay out of the way
        swung.current = false
        if (pointer.current !== null || useGame.getState().focus || busy()) return
        swung.current = true
        pointer.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        pressAttack()
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onClick={(e) => {
        if (swung.current) return void (swung.current = false)
        // Keyboard / assistive tech: no press came first, so swing here if there was nothing to use.
        if (!interact() && e.detail === 0) {
          pressAttack()
          releaseAttack()
        }
      }}
    >
      A
    </button>
  )
}

// Hold to sprint; with the fishing rod in hand, a quick tap (under TAP seconds) puts it away (not
// mid-reel, so a stray tap can't lose a fish). The sword is on A. Pointer capture keeps
// the release tracked even if the thumb slides off the button.
const TAP = 0.22
function SprintButton() {
  const pointer = useRef<number | null>(null)
  const downAt = useRef(0)
  const set = (on: boolean, el: HTMLButtonElement) => {
    buttons.sprint = on
    el.setAttribute('aria-pressed', String(on))
  }
  const end = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    set(false, e.currentTarget)
    if (e.type === 'pointerup' && performance.now() - downAt.current < TAP * 1000) {
      const { rod, phase } = useFishing.getState()
      if (rod && phase !== 'reel') putAwayRod()
    }
  }
  return (
    <button
      type="button"
      className="action-button action-button-b"
      aria-label="Sprint (hold); put away the rod (tap)"
      aria-pressed="false"
      onPointerDown={(e) => {
        e.preventDefault()
        pointer.current = e.pointerId
        downAt.current = performance.now()
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true, e.currentTarget)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onClick={(e) => {
        // Keyboard / assistive tech can't hold, so a click toggles sprint instead.
        if (e.detail === 0) set(!buttons.sprint, e.currentTarget)
      }}
    >
      B
    </button>
  )
}

// Only touch-first devices get on-screen controls; desktops use the keyboard. The stick is TouchStick, above.
export function Joystick() {
  return isTouch ? (
    <>
      <SprintButton />
      <ActionButton />
    </>
  ) : null
}
