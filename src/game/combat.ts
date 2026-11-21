import { useFishing } from './fishing'
import { busy, sayFirst } from './core/interact'
import { isTouch } from './core/quality'
import { hit as hitSound, whoosh } from './core/sfx'
import { playerFacing, playerPos, playerRoll } from './core/state'
import { keyName } from './core/keymap'

// The sword (Sword.tsx draws it). A press swings it in an arc in front of the player; keep holding
// after the swing to charge, and let go once charged for a spin attack all the way round, twice as
// strong. Anything that can be hit (grass, pots, slimes) registers here with addHittable, the same
// pattern as interactables in interact.ts. Gentle by design: nothing here can block a project.

/** Something the sword can hit: a circle on the ground, and what happens when it's struck. */
export type Hittable = {
  x: number
  z: number
  r: number
  /** Struck with `power` (1 a swing, 2 a spin), from the direction (dx, dz) the blow travels. */
  hit: (power: number, dx: number, dz: number) => void
}

export const hittables: Hittable[] = []

/** Adds a hittable; returns a function that removes it (use as an effect cleanup). */
export function addHittable(h: Hittable): () => void {
  hittables.push(h)
  return () => {
    const i = hittables.indexOf(h)
    if (i >= 0) hittables.splice(i, 1)
  }
}

export const SWING_TIME = 0.24 // seconds for a swing
export const SPIN_TIME = 0.45 // and for a spin
const HIT_AT = 0.07 // seconds into a swing when it strikes
const SPIN_HIT_AT = 0.12
const REACH = 0.95 // how far in front of the player a swing reaches (to a target's edge)
const SPIN_REACH = 1.25 // and a spin, all the way round
const ARC = Math.cos((80 * Math.PI) / 180) // a swing hits within 80° either side of facing
export const CHARGE = 0.65 // seconds of holding after a swing before a spin is ready

/**
 * The sword's state, outside React. `t` is seconds into the current swing or spin (-1 if none);
 * `holding` while the button is down; `charge` counts up while holding after a swing.
 */
export const sword = { t: -1, spin: false, struck: false, holding: false, charge: 0 }

/** The attack button went down: swing, unless something else has the player's hands. */
export function pressAttack() {
  if (busy() || playerRoll.p >= 0 || sword.t >= 0) return
  if (useFishing.getState().rod) {
    sayFirst(
      'sword-rod',
      [`Your hands are full with the fishing rod. ${isTouch ? 'Tap B to put it away' : `Right-click or press ${keyName('bag')} to put it away`} to use your sword.`],
      ['Your hands are full with the rod.'],
    )
    return
  }
  sword.holding = true
  sword.charge = 0
  start(false)
}

/** The attack button came up: a charged sword spins. */
export function releaseAttack() {
  const charged = sword.holding && sword.charge >= CHARGE
  sword.holding = false
  sword.charge = 0
  if (charged && sword.t < 0 && !busy()) start(true)
}

function start(spin: boolean) {
  sword.t = 0
  sword.spin = spin
  sword.struck = false
  whoosh()
}

/** True while a swing or spin is under way (the player slows down meanwhile). */
export const swinging = () => sword.t >= 0

/** Advances the sword by `dt` seconds and strikes at the right moment; called every frame by <Sword>. */
export function updateSword(dt: number) {
  if (sword.t >= 0) {
    sword.t += dt
    if (!sword.struck && sword.t >= (sword.spin ? SPIN_HIT_AT : HIT_AT)) {
      sword.struck = true
      strike(sword.spin)
    }
    if (sword.t >= (sword.spin ? SPIN_TIME : SWING_TIME)) sword.t = -1
  } else if (sword.holding) {
    // Charging only counts once the swing is over and the button is still down.
    if (busy()) sword.holding = false
    else sword.charge += dt
  }
}

function strike(spin: boolean) {
  const fx = Math.sin(playerFacing.heading)
  const fz = Math.cos(playerFacing.heading)
  const reach = spin ? SPIN_REACH : REACH
  let any = false
  // Backwards, since a hit can remove the hittable (a cut tuft, a popped slime).
  for (let i = hittables.length - 1; i >= 0; i--) {
    const h = hittables[i]
    const dx = h.x - playerPos.x
    const dz = h.z - playerPos.z
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d > reach + h.r) continue
    const nx = d > 1e-6 ? dx / d : fx
    const nz = d > 1e-6 ? dz / d : fz
    if (!spin && d > h.r && nx * fx + nz * fz < ARC) continue // behind or beside: out of the arc
    h.hit(spin ? 2 : 1, nx, nz)
    any = true
  }
  if (any) hitSound()
}
