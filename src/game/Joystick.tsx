import { useRef, type PointerEvent } from 'react'
import { actions, buttons, stick } from './input'
import { isTouch } from './quality'

const TRAVEL = 40 // px the knob can move from center
const DEAD_ZONE = 0.15

function Stick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)

  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer.current || !base.current || !knob.current) return
    const r = base.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
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
    pointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    move(e)
  }

  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    stick.x = stick.z = 0
    if (knob.current) knob.current.style.transform = ''
  }

  return (
    <div
      ref={base}
      className="joystick"
      aria-hidden="true"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div ref={knob} className="joystick-knob" />
    </div>
  )
}

// Controller-style face button. Fires on press (not release) so the roll feels instant.
function RollButton() {
  const roll = () => {
    actions.roll = true
  }
  return (
    <button
      type="button"
      className="action-button"
      aria-label="Roll"
      onPointerDown={(e) => {
        e.preventDefault() // keep focus and the 300ms tap delay out of the way
        roll()
      }}
      onClick={(e) => {
        if (e.detail === 0) roll() // keyboard / assistive-tech activation, which has no pointerdown
      }}
    >
      A
    </button>
  )
}

// Hold to sprint. Pointer capture keeps the release tracked even if the thumb slides off the button.
function SprintButton() {
  const pointer = useRef<number | null>(null)
  const set = (on: boolean, el: HTMLButtonElement) => {
    buttons.sprint = on
    el.setAttribute('aria-pressed', String(on))
  }
  const end = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    set(false, e.currentTarget)
  }
  return (
    <button
      type="button"
      className="action-button action-button-b"
      aria-label="Sprint"
      aria-pressed="false"
      onPointerDown={(e) => {
        e.preventDefault()
        pointer.current = e.pointerId
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

// Only touch-first devices get on-screen controls; desktops use the keyboard.
export function Joystick() {
  return isTouch ? (
    <>
      <Stick />
      <SprintButton />
      <RollButton />
    </>
  ) : null
}
