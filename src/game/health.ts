import { say, sayFirst } from './core/interact'
import { keysName } from './core/keymap'
import { isTouch } from './core/quality'
import { BED_SPAWN } from './world/layout'
import { clearSpawn } from './room'
import { FADE, goTo } from './core/scene'
import { hurt } from './core/sfx'
import { playerVel } from './core/state'
import { useGame } from './core/store'

// Hearts that matter, gently. A bump (a slime, slimes.ts) costs half a heart, knocks the player
// back and leaves them flickering and untouchable for a moment. At zero hearts, a soft fade and
// they wake up in bed at home with full hearts: nothing is lost, and nothing stands between a
// visitor and the projects. Health is counted in half hearts (store.ts: health, maxHearts).

const INVULN = 1.2 // seconds of flicker after a bump, when nothing can hurt the player again
const STAGGER = 0.22 // seconds the bump takes control away, while the knockback plays out
const KNOCK = 6 // speed the player is knocked back at (units/s)

/** Per-frame state, outside React: seconds of invulnerability and stagger left. Player.tsx counts them down. */
export const harm = { invuln: 0, stagger: 0 }

/** Costs `halves` half hearts, knocked back along (dx, dz). Ignored while invulnerable. */
export function damage(halves: number, dx: number, dz: number) {
  const { health } = useGame.getState()
  if (harm.invuln > 0 || health <= 0 || useGame.getState().fading) return
  const next = Math.max(0, health - halves)
  useGame.setState({ health: next })
  harm.invuln = INVULN
  harm.stagger = STAGGER
  const len = Math.hypot(dx, dz) || 1
  playerVel.x = (dx / len) * KNOCK
  playerVel.z = (dz / len) * KNOCK
  hurt()
  if (next === 0) faint()
  else
    sayFirst(
      'bumped',
      ['Oof! Slimes bump.', `${isTouch ? 'Tap B' : `Click, or press ${keysName('attack')},`} to swing your sword. Hold it after a swing, then let go, to spin.`],
      [],
    )
}

/** Restores `halves` half hearts, up to the containers there are. */
export function heal(halves: number) {
  const { health, maxHearts } = useGame.getState()
  useGame.setState({ health: Math.min(maxHearts * 2, health + halves) })
}

/** True while hearts aren't full (drops prefer a heart then). */
export const hurting = () => useGame.getState().health < useGame.getState().maxHearts * 2

// Out of hearts: fade, wake in bed at home with every heart back, and say so once the fade lifts.
function faint() {
  goTo('house', clearSpawn(BED_SPAWN))
  setTimeout(() => {
    heal(99)
    harm.invuln = 0
    say(['You wake up at home, feeling much better.', 'Nothing was lost. The slimes are only playing, mostly.'])
  }, FADE * 2000 + 100)
}
