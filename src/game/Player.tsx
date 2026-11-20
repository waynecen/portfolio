import { useFrame } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { MathUtils, type Group } from 'three'
import { pushOutOfBox, resolve } from './collision'
import { HeldRod } from './Dock'
import { dockOpens, onDock } from './fishing'
import { TILE } from './grid'
import { isLand } from './Island'
import { PLAYER_MODEL } from './models'
import { actions, bindKeys, buttons, keys, stick } from './input'
import { PillCharacter, PILL_RADIUS } from './PillCharacter'
import { PlayerGround } from './PlayerGround'
import { roadTiles } from './pois'
import { winter } from './season'
import { step, whoosh, type Surface } from './sfx'
import { playerFacing, playerPos, playerRoll, playerVel, teleport } from './state'
import { busy } from './interact'
import { useGame } from './store'

const SPEED = 2.5 // walking speed, units per second (about 2 body heights a second, so a chibi's steps can keep up)
const SPRINT = 2.5 // holding Shift (or B on touch) multiplies top speed by this (2.5 → 6.25 units/s)
const ACCEL = 12 // damp rate toward the input velocity while a direction is held
const DECEL = 16 // a little snappier when letting go
const SHORE = 0.15 // stop this far short of the cliff edge, so the feet stay on the rim
const EDGE = PILL_RADIUS + SHORE // how close the pill's centre gets to a water tile; keep at most half a tile

const ROLL_TIME = 0.45 // seconds for one tumble
const ROLL_SPEED = 9 // burst speed at the start of a roll, eases down toward walk speed
const ROLL_COOLDOWN = 0.2 // seconds after a roll before the next can start
const STEP_LEN = [0.45, 0.7] // units travelled per footstep sound: walking, and at full sprint

const roads = new Set(roadTiles.map((t) => t.i + ',' + t.j))
function surfaceAt(x: number, z: number): Surface {
  if (useGame.getState().scene === 'house') return 'tatami'
  if (onDock(x, z)) return 'wood'
  return roads.has(Math.round(x / TILE) + ',' + Math.round(z / TILE)) ? 'road' : winter ? 'snow' : 'grass'
}

// The 3D character's code (and the glTF loader) is fetched only if there's a model to show.
const ModelCharacter = lazy(() => import('./ModelCharacter'))

export function Player() {
  const ref = useRef<Group>(null)
  const cooldown = useRef(0)
  const stride = useRef(0) // distance since the last footstep sound

  useEffect(() => bindKeys(), [])

  useFrame((_, delta) => {
    const root = ref.current
    if (!root) return
    const dt = Math.min(delta, 0.1)
    const v = playerVel
    const roll = playerRoll

    // Arrive somewhere new (see scene.ts): stand still, facing the way the door points.
    if (teleport.pending) {
      teleport.pending = false
      root.position.x = teleport.x
      root.position.z = teleport.z
      v.x = v.z = v.speed = 0
      roll.p = -1
      playerFacing.heading = teleport.heading
      playerFacing.snap = true
    }

    // Stand still while a dialogue box or panel is open.
    const talking = busy()

    // Start a roll in the direction the character is facing (works from standing still too).
    cooldown.current -= dt
    if (talking) actions.roll = false
    if (actions.roll) {
      actions.roll = false
      if (roll.p < 0 && cooldown.current <= 0) {
        roll.p = 0
        roll.dirX = Math.sin(playerFacing.heading)
        roll.dirZ = Math.cos(playerFacing.heading)
        whoosh()
      }
    }

    let x = talking ? 0 : +keys.right - +keys.left + stick.x
    let z = talking ? 0 : +keys.back - +keys.forward + stick.z
    const len2 = x * x + z * z
    // Cap at full speed: diagonals don't go faster, a half-pushed stick goes slower.
    if (len2 > 1) {
      const s = 1 / Math.sqrt(len2)
      x *= s
      z *= s
    }

    if (roll.p >= 0) {
      // Committed burst: input is ignored until the tumble finishes.
      roll.p += dt / ROLL_TIME
      if (roll.p >= 1) {
        roll.p = -1
        cooldown.current = ROLL_COOLDOWN
      } else {
        const burst = ROLL_SPEED * (1 - 0.6 * roll.p)
        v.x = roll.dirX * burst
        v.z = roll.dirZ * burst
      }
    }
    if (roll.p < 0) {
      // Ease velocity toward the input instead of snapping, so starts and stops feel weighty.
      // Sprint eases in and out through the same damp, so pressing Shift ramps up rather than jumps.
      const rate = len2 > 0 ? ACCEL : DECEL
      const top = keys.sprint || buttons.sprint ? SPEED * SPRINT : SPEED
      v.x = MathUtils.damp(v.x, x * top, rate, dt)
      v.z = MathUtils.damp(v.z, z * top, rate, dt)
      if (len2 === 0 && v.x * v.x + v.z * v.z < 1e-4) v.x = v.z = 0
    }

    // Move in substeps no longer than half the body's radius, so a fast roll can't tunnel through thin obstacles.
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

    // Relative to walking speed: 1 = walking, 2.5 = sprinting. Capped so the roll burst doesn't spin the legs.
    v.speed = Math.min(SPRINT, Math.sqrt(v.x * v.x + v.z * v.z) / SPEED)
    // Footsteps by distance, so they suit any character and speed. The first lands soon after setting off.
    const len = STEP_LEN[0] + (STEP_LEN[1] - STEP_LEN[0]) * MathUtils.clamp(v.speed - 1, 0, 1)
    if (roll.p >= 0 || v.speed < 0.1) stride.current = len * 0.7
    else if ((stride.current += v.speed * SPEED * dt) >= len) {
      stride.current -= len
      step(surfaceAt(p.x, p.z))
    }
    playerPos.x = p.x
    playerPos.z = p.z
  })

  return (
    <group ref={ref}>
      <PlayerGround />
      <HeldRod />
      {PLAYER_MODEL ? (
        // The pill stands in while the model downloads.
        <Suspense fallback={<PillCharacter />}>
          <PillCharacter model={<ModelCharacter url={PLAYER_MODEL} />} />
        </Suspense>
      ) : (
        <PillCharacter />
      )}
    </group>
  )
}
