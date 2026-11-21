import { create } from 'zustand'
import { pad } from '../core/gamepad'
import { closeDialogue, held, say, sayFirst } from '../core/interact'
import { keys, stick } from '../core/input'
import { hint } from '../core/keymap'
import { readSaved, writeSaved } from '../core/persist'
import { putter } from '../core/putt'
import { chime, click, plop, reelClick } from '../core/sfx'
import { playerPos, teleport } from '../core/state'
import { useGame } from '../core/store'
import { HOLES, type Box, type Hole } from './holes'

// Mini golf on the links (holes.ts has the holes, Course.tsx draws them, GolfHud.tsx the meter).
// Walk up to the ball and use it to step up to it: the player holds still behind the ball while
// the walk keys, the stick or a drag aim. Hold the sword's key or button to charge (the power rises
// and falls while it's held) and let go to putt; or drag back from anywhere on the screen and let
// go, like a slingshot. The ball rolls with friction, bounces off the kerb and the blocks, and drops
// in the cup if it's slow enough, lipping out if not. Everything per frame is outside React.

export const BALL_R = 0.07
export const CUP_R = 0.13 // the ball drops when its centre comes this close to the cup's...
const SINK_SPEED = 1.9 // ...and it's slower than this (units/s); faster, it rolls over the lip
const LIP = 0.35 // a lip-out turns the ball by up to this much (radians) and keeps 70% of its speed
const PULL = 0.32 // within this of the cup, a slow ball is drawn toward it
const PULL_ACCEL = 2.5 // ...this hard (units/s²)
const FRICTION = 2.2 // rolling slows the ball by this much (units/s²)...
const DRAG = 0.3 // ...plus this share of its speed every second, so a hard putt settles sooner
const STOP = 0.05 // below this speed it stops
const BOUNCE = 0.72 // share of its speed the ball keeps off a wall
export const MAX_SPEED = 7.5 // a full-power putt (units/s)
const CHARGE = 0.9 // seconds from no power to full while charging; then back down, and up again
const AIM_SPEED = 1.8 // radians/s the walk keys or the stick turn the aim
const RANGE = 0.8 // how close to the ball the player has to be to step up to it
const STAND = 0.5 // how far behind the ball the player stands
const DRAG_FULL = 0.32 // a drag this long (share of the screen's shorter side) is full power
const SUNK_FOR = 1.2 // seconds the ball sits in the cup before it's back on the tee
const STEP = 1 / 240 // physics step: short enough that a full-power putt can't pass through a kerb
const NEAR = 2.5 // the scorecard shows within this of the green

type Phase = 'rest' | 'aim' | 'roll' | 'sunk'
type State = {
  hole: number
  phase: Phase
  strokes: number
  /** True while the sword's key or a drag is charging the putt (GolfHud.tsx shows the meter). */
  charging: boolean
  /** Fewest strokes for each hole so far, kept in this browser. */
  best: (number | null)[]
  /** The player is by the green (GolfHud.tsx shows the scorecard). */
  near: boolean
}

const KEY = 'golf-v1' // persist.ts: progress, so Start over forgets it
function loadBest(): (number | null)[] {
  const v = readSaved(KEY) as { best?: unknown } | undefined
  const best = Array.isArray(v?.best) ? v.best : []
  return HOLES.map((_, k) => (typeof best[k] === 'number' && best[k] > 0 ? (best[k] as number) : null))
}

export const useGolf = create<State>(() => ({ hole: 0, phase: 'rest', strokes: 0, charging: false, best: loadBest(), near: false }))

/** Per-frame state, outside React: the ball, and the aim (an angle like playerFacing: 0 = toward the camera). */
export const ball = { x: HOLES[0].tee.x, z: HOLES[0].tee.z, vx: 0, vz: 0, sunkFor: 0, lipped: false }
export const aim = { angle: 0, power: 0, t: 0, drag: null as null | { x: number; y: number; id: number } }

/** The ball's use point (Course.tsx registers it): it follows the ball, and only shows while it rests. */
export const ballSpot = { x: ball.x, z: ball.z, range: RANGE, prompt: 'Putt', onInteract: () => address() }

export const currentHole = (): Hole => HOLES[useGolf.getState().hole]

const toCup = () => {
  const { cup } = currentHole()
  return Math.atan2(cup.x - ball.x, cup.z - ball.z)
}

/** Steps up to the ball, aiming at the cup. */
export function address() {
  const g = useGolf.getState()
  if (g.phase !== 'rest' || held()) return
  closeDialogue()
  aim.angle = toCup()
  aim.power = 0
  aim.drag = null
  useGolf.setState({ phase: 'aim', charging: false })
  useGame.setState({ putting: true, focus: null })
  if (!g.strokes)
    sayFirst(
      'golf-how',
      [
        'Line it up, then give it a tap.',
        hint('{left} and {right} to aim. Hold {attack} to charge, let go to putt, or drag back with the mouse and let go. {interact} steps away.', 'Drag back from the ball and let go, like a slingshot.'),
      ],
      [],
    )
}

/** Steps away from the ball without putting. */
export function leave() {
  if (useGolf.getState().phase !== 'aim') return
  aim.drag = null
  useGolf.setState({ phase: 'rest', charging: false })
  useGame.setState({ putting: false })
}

function startCharge() {
  if (useGolf.getState().phase !== 'aim') return
  aim.t = 0
  aim.power = 0
  useGolf.setState({ charging: true })
}

function putt(power: number) {
  useGolf.setState({ charging: false })
  if (power < 0.04) return // too soft to count: still aiming
  const speed = power * MAX_SPEED
  ball.vx = Math.sin(aim.angle) * speed
  ball.vz = Math.cos(aim.angle) * speed
  ball.lipped = false
  click()
  useGolf.setState({ phase: 'roll', strokes: useGolf.getState().strokes + 1 })
  useGame.setState({ putting: false })
}

putter.press = startCharge
putter.release = () => {
  if (useGolf.getState().charging && !aim.drag) putt(aim.power)
}
putter.leave = leave

// ---- A drag on the screen: pull back from the ball and let go. Screen right is world +x and screen
// down is world +z (the camera looks north), so the putt goes the opposite way to the pull.
export function dragStart(e: PointerEvent) {
  if (useGolf.getState().phase !== 'aim' || aim.drag) return
  aim.drag = { x: e.clientX, y: e.clientY, id: e.pointerId }
  aim.power = 0
  useGolf.setState({ charging: true })
}
export function dragMove(e: PointerEvent) {
  const d = aim.drag
  if (!d || e.pointerId !== d.id) return
  const dx = e.clientX - d.x
  const dy = e.clientY - d.y
  const len = Math.hypot(dx, dy)
  aim.power = Math.min(1, len / (DRAG_FULL * Math.min(innerWidth, innerHeight)))
  if (len > 8) aim.angle = Math.atan2(-dx, -dy)
}
export function dragEnd(e: PointerEvent) {
  const d = aim.drag
  if (!d || e.pointerId !== d.id) return
  aim.drag = null
  putt(aim.power)
}

// ---- Each frame (Course.tsx).
export function stepGolf(dt: number) {
  const g = useGolf.getState()
  if (g.phase === 'aim') {
    if (!aim.drag) aim.angle -= (+keys.right - +keys.left + stick.x + pad.x) * AIM_SPEED * dt
    if (g.charging && !aim.drag) {
      aim.t += dt
      const k = (aim.t / CHARGE) % 2
      aim.power = k < 1 ? k : 2 - k // up to full, back down, and up again
    }
    // Stand behind the ball, facing along the aim.
    teleport.pending = true
    teleport.x = ball.x - Math.sin(aim.angle) * STAND
    teleport.z = ball.z - Math.cos(aim.angle) * STAND
    teleport.heading = aim.angle
  } else if (g.phase === 'roll') {
    for (let left = dt; left > 0; left -= STEP) if (roll(Math.min(STEP, left))) break
  } else if (g.phase === 'sunk') {
    ball.sunkFor += dt
    if (ball.sunkFor >= SUNK_FOR) holeDone()
  }
  ballSpot.x = ball.x
  ballSpot.z = ball.z
  ballSpot.range = g.phase === 'rest' ? RANGE : 0
  const gr = currentHole().green
  const near = Math.abs(playerPos.x - gr.x) < gr.hx + NEAR && Math.abs(playerPos.z - gr.z) < gr.hz + NEAR
  if (near !== g.near) useGolf.setState({ near })
}

// One physics step. Returns true once the ball has stopped or dropped.
function roll(h: number): boolean {
  const hole = currentHole()
  let speed = Math.hypot(ball.vx, ball.vz)
  // Near the cup, a slow ball is drawn in.
  const cx = hole.cup.x - ball.x
  const cz = hole.cup.z - ball.z
  const d = Math.hypot(cx, cz)
  if (d < PULL && speed < SINK_SPEED * 1.2 && d > 1e-4) {
    ball.vx += (cx / d) * PULL_ACCEL * h
    ball.vz += (cz / d) * PULL_ACCEL * h
  }
  // Rolling friction and drag.
  speed = Math.hypot(ball.vx, ball.vz)
  const slow = Math.max(0, speed - (FRICTION + DRAG * speed) * h)
  if (speed > 0) {
    ball.vx *= slow / speed
    ball.vz *= slow / speed
  }
  ball.x += ball.vx * h
  ball.z += ball.vz * h
  // The kerb round the green, then the blocks on it.
  const gr = hole.green
  const x0 = gr.x - gr.hx + BALL_R
  const x1 = gr.x + gr.hx - BALL_R
  const z0 = gr.z - gr.hz + BALL_R
  const z1 = gr.z + gr.hz - BALL_R
  if (ball.x < x0 || ball.x > x1) {
    ball.x = ball.x < x0 ? x0 : x1
    ball.vx = -ball.vx * BOUNCE
    bump()
  }
  if (ball.z < z0 || ball.z > z1) {
    ball.z = ball.z < z0 ? z0 : z1
    ball.vz = -ball.vz * BOUNCE
    bump()
  }
  for (const b of hole.blocks) bounceOff(b)
  // The cup: in if slow enough, over the lip if not.
  const ex = hole.cup.x - ball.x
  const ez = hole.cup.z - ball.z
  const e = Math.hypot(ex, ez)
  speed = Math.hypot(ball.vx, ball.vz)
  if (e < CUP_R) {
    if (speed < SINK_SPEED) {
      sink()
      return true
    }
    if (!ball.lipped) {
      ball.lipped = true
      const turn = (Math.random() - 0.5) * 2 * LIP
      const c = Math.cos(turn) * 0.7
      const s = Math.sin(turn) * 0.7
      const vx = ball.vx
      ball.vx = vx * c - ball.vz * s
      ball.vz = vx * s + ball.vz * c
      reelClick()
    }
  } else if (e > CUP_R * 1.5) ball.lipped = false
  if (speed < STOP) {
    ball.vx = ball.vz = 0
    useGolf.setState({ phase: 'rest' })
    return true
  }
  return false
}

// A block on the green: pushed out along the shallower side, and bounced back off it.
function bounceOff(b: Box) {
  const dx = ball.x - b.x
  const dz = ball.z - b.z
  const px = b.hx + BALL_R - Math.abs(dx)
  const pz = b.hz + BALL_R - Math.abs(dz)
  if (px <= 0 || pz <= 0) return
  if (px < pz) {
    ball.x += Math.sign(dx) * px
    ball.vx = -ball.vx * BOUNCE
  } else {
    ball.z += Math.sign(dz) * pz
    ball.vz = -ball.vz * BOUNCE
  }
  bump()
}

let lastBump = 0
function bump() {
  const now = performance.now()
  if (now - lastBump > 80 && Math.hypot(ball.vx, ball.vz) > 0.4) reelClick()
  lastBump = now
}

function sink() {
  ball.vx = ball.vz = 0
  ball.x = currentHole().cup.x
  ball.z = currentHole().cup.z
  ball.sunkFor = 0
  plop()
  useGolf.setState({ phase: 'sunk' })
}

// In the cup: say the score, keep the best, and set the ball back on the tee to go again.
function holeDone() {
  const { hole, strokes, best } = useGolf.getState()
  const h = HOLES[hole]
  const was = best[hole]
  const next = best.slice()
  if (was === null || strokes < was) next[hole] = strokes
  writeSaved(KEY, { best: next })
  const words =
    strokes === 1 ? 'A hole in one!' : strokes < h.par ? `${strokes} strokes, under par!` : strokes === h.par ? `${strokes} strokes: par.` : `${strokes} strokes, par ${h.par}.`
  const record = was !== null && strokes < was ? ' Your best yet.' : ''
  if (strokes <= h.par) chime()
  if (Math.hypot(playerPos.x - ball.x, playerPos.z - ball.z) < 8) say([`${words}${record}`, 'The ball’s back on the tee for another go.'])
  ball.x = h.tee.x
  ball.z = h.tee.z
  useGolf.setState({ phase: 'rest', strokes: 0, best: next })
}
