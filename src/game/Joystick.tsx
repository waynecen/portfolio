import { useRef, type PointerEvent } from 'react'
import { stick } from './input'

// Only touch-first devices get the on-screen stick; desktops use the keyboard.
const coarse = matchMedia('(pointer: coarse)').matches

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

export function Joystick() {
  return coarse ? <Stick /> : null
}
