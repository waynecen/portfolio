import { useFrame } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { MathUtils, type Group } from 'three'
import { pushOutOfBox, resolve } from '../core/collision'
import { swinging } from '../combat/combat'
import { HeldRod } from '../life/Dock'
import { harm } from '../combat/health'
import { Sword } from './Sword'
import { Hat } from './Hat'
import { dockOpens, onDock } from '../life/fishing'
import { TILE } from '../core/grid'
import { isLand } from '../world/land'
import { inSquare } from '../world/layout'
import { PLAYER_MODEL } from './models'
import { pad } from '../core/gamepad'
import { bindKeys, buttons, keys, stick } from '../core/input'
import { PillCharacter, PILL_RADIUS } from './PillCharacter'
import { PlayerGround } from './PlayerGround'
import { roadTiles } from '../world/pois'
import { winter } from '../world/season'
import { sky } from '../world/sky'
import { step, type Surface } from '../core/sfx'
import { playerFacing, playerPos, playerVel, teleport } from '../core/state'
import { held } from '../core/interact'
import { useGame } from '../core/store'
import { addPrint } from './prints'
import { secretOn } from '../secrets/secrets'
import { Held } from '../core/Held'

const SPEED = 2.5 // walking speed, units per second (about 2 body heights a second, so a chibi's steps can keep up)
const SPRINT = 1.8 // holding Shift (or B on touch) multiplies top speed by this (1.8 → 4.5 units/s)
const ACCEL = 12 // damp rate toward the input velocity while a direction is held
const DECEL = 16 // a little snappier when letting go
const SHORE = 0.15 // stop this far short of the cliff edge, so the feet stay on the rim
const EDGE = PILL_RADIUS + SHORE // how close the pill's centre gets to a water tile; keep at most half a tile

const STEP_LEN = [0.45, 0.7] // units travelled per footstep sound: walking, and at full sprint
const TINY = 0.55 // the character's size with the "tiny you" secret on (secrets.ts)
const SWING_SPEED = 0.35 // top speed while swinging the sword, as a share (combat.ts)
const KNOCK_DECEL = 5 // how quickly a knockback eases off (health.ts); lower = further
const FLICKER = 14 // flickers per second while invulnerable after a bump

const roads = new Set(roadTiles.map((t) => t.i + ',' + t.j))
function surfaceAt(x: number, z: number): Surface {
  if (useGame.getState().scene === 'house') return 'tatami'
  if (useGame.getState().scene === 'cave') return 'road' // stone
  if (onDock(x, z)) return 'wood'
  const i = Math.round(x / TILE)
  const j = Math.round(z / TILE)
  return roads.has(i + ',' + j) || inSquare(i, j) ? 'road' : winter ? 'snow' : 'grass'
}

// Footsteps splash in the rain: outdoors, while it's raining (not in winter, when it snows instead).
const WET_RAIN = 0.5 // how much rain (sky.weather.rain, 0..1) before steps splash
const wet = () => !winter && useGame.getState().scene === 'world' && sky.weather.rain > WET_RAIN

// The 3D character's code (and the glTF loader) is fetched only if there's a model to show.
const ModelCharacter = lazy(() => import('./ModelCharacter'))

export function Player() {
  const ref = useRef<Group>(null)
  const stride = useRef(0) // distance since the last footstep sound

  useEffect(() => bindKeys(), [])

  useFrame((_, delta) => {
    const root = ref.current
    if (!root) return
    const dt = Math.min(delta, 0.1)
    const v = playerVel

    // Arrive somewhere new (see scene.ts): stand still, facing the way the door points.
    if (teleport.pending) {
      teleport.pending = false
      root.position.x = teleport.x
      root.position.z = teleport.z
      v.x = v.z = v.speed = 0
      playerFacing.heading = teleport.heading
      playerFacing.snap = true
    }

    // Stand still while a panel is open, fading between areas, editing or fishing. Not for dialogue:
    // the player can walk off mid-conversation, which closes it (Interactions.tsx).
    const talking = held()

    // A bump (health.ts) takes control away for a moment while the knockback plays out.
    harm.invuln = Math.max(0, harm.invuln - dt)
    harm.stagger = Math.max(0, harm.stagger - dt)
    const still = talking || harm.stagger > 0
    let x = still ? 0 : +keys.right - +keys.left + stick.x + pad.x
    let z = still ? 0 : +keys.back - +keys.forward + stick.z + pad.z
    const len2 = x * x + z * z
    // Cap at full speed: diagonals don't go faster, a half-pushed stick goes slower.
    if (len2 > 1) {
      const s = 1 / Math.sqrt(len2)
      x *= s
      z *= s
    }

    // Ease velocity toward the input instead of snapping, so starts and stops feel weighty.
    // Sprint eases in and out through the same damp, so pressing Shift ramps up rather than jumps.
    const rate = harm.stagger > 0 ? KNOCK_DECEL : len2 > 0 ? ACCEL : DECEL
    // Swinging the sword slows the player to SWING_SPEED, so a swing plants the feet.
    const top = (keys.sprint || buttons.sprint || pad.sprint ? SPEED * SPRINT : SPEED) * (swinging() ? SWING_SPEED : 1)
    v.x = MathUtils.damp(v.x, x * top, rate, dt)
    v.z = MathUtils.damp(v.z, z * top, rate, dt)
    if (len2 === 0 && v.x * v.x + v.z * v.z < 1e-4) v.x = v.z = 0

    // Move in substeps no longer than half the body's radius, so a fast knockback can't tunnel through thin obstacles.
    const p = root.position
    const steps = Math.max(1, Math.ceil((Math.sqrt(v.x * v.x + v.z * v.z) * dt) / (PILL_RADIUS * 0.5)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      p.x += v.x * h
      p.z += v.z * h
      resolve(p, PILL_RADIUS, v)
    }

    // Outdoors, keep the pill on the island: every water tile around it acts as a wall, so it slides
    // along the stepped shore. EDGE is at most half a tile, so only the 3×3 tiles around it can
    // touch. The water by the dock lets them onto it (fishing.ts). Indoors, the room's own wall colliders do this job.
    if (useGame.getState().scene === 'world') {
      const ti = Math.round(p.x / TILE)
      const tj = Math.round(p.z / TILE)
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++)
          if (!isLand(ti + di, tj + dj) && !dockOpens(ti + di, tj + dj, p.x))
            pushOutOfBox(p, EDGE, v, (ti + di) * TILE, (tj + dj) * TILE, TILE / 2, TILE / 2)
    }

    // Relative to walking speed: 1 = walking, 2.5 = sprinting. Capped so a knockback doesn't spin the legs.
    v.speed = Math.min(SPRINT, Math.sqrt(v.x * v.x + v.z * v.z) / SPEED)
    // Footsteps by distance, so they suit any character and speed. The first lands soon after setting off.
    const len = STEP_LEN[0] + (STEP_LEN[1] - STEP_LEN[0]) * MathUtils.clamp(v.speed - 1, 0, 1)
    if (v.speed < 0.1) stride.current = len * 0.7
    else if ((stride.current += v.speed * SPEED * dt) >= len) {
      stride.current -= len
      const surface = surfaceAt(p.x, p.z)
      step(surface, wet())
      if ((surface === 'road' || surface === 'snow') && useGame.getState().scene === 'world') addPrint(p.x, p.z, playerFacing.heading, surface)
    }
    playerPos.x = p.x
    playerPos.z = p.z
    // The "tiny you" secret: the character (and its shadow and light) shrink; collisions don't change.
    root.scale.setScalar(secretOn('tiny') ? TINY : 1)
    // After a bump, the character flickers while nothing can hurt it.
    root.visible = harm.invuln <= 0 || Math.floor(harm.invuln * FLICKER) % 2 === 0
  })

  return (
    <group ref={ref}>
      <PlayerGround />
      <HeldRod />
      <Sword />
      <Hat />
      {PLAYER_MODEL ? (
        // The pill stands in while the model downloads (behind the loader: Held).
        <Suspense
          fallback={
            <Held>
              <PillCharacter />
            </Held>
          }
        >
          <PillCharacter model={<ModelCharacter url={PLAYER_MODEL} />} />
        </Suspense>
      ) : (
        <PillCharacter />
      )}
    </group>
  )
}
