import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, MeshLambertMaterial, SphereGeometry, type Group } from 'three'
import { addHittable } from './combat'
import { maybeDrop } from './drops'
import { burst } from '../player/Dust'
import { damage, harm } from './health'
import { busy } from '../core/interact'
import { isInland } from '../world/Island'
import { reducedMotion, useSettings } from '../core/settings'
import { pop } from '../core/sfx'
import { playerPos, playerRoll } from '../core/state'
import { useGame } from '../core/store'
import { clear, nearPath } from '../world/tiles'

// A few slimes in the outer meadows. Each hops about near its home; when the player comes close
// it hops toward them, and a bump costs half a heart (health.ts). Two sword hits, or one spin,
// pop it (combat.ts), maybe leaving a shell or a heart (drops.ts); it comes back a while later,
// out of sight. Gentle by design: slimes never hop onto a road or near a place, so the way to
// every project stays clear, and the settings can switch them off altogether.

const COUNT = 5
const SEED = 23
const HOME_AWAY = 8 // homes are at least this far from the house
const LEASH = 3 // how far a slime wanders from home
const SEE = 3.2 // how close the player must be before a slime hops their way
const HOP_TIME = 0.38 // seconds in the air per hop
const HOP_SPEED = 1.6 // ground speed during a hop (units/s); chasing hops at CHASE_SPEED
const CHASE_SPEED = 2.3
const REST = [0.6, 1.4] // seconds sat between hops
const BUMP = 0.5 // how close counts as a bump
const HP = 2
const KNOCK = 5 // how fast a hit knocks it back (units/s), easing off
const RESPAWN = 40 // seconds before a popped slime is back, if the player is far from its home
const RESPAWN_AWAY = 8
const DROP = { heart: 0.25, shell: 0.5 }
const COLORS = ['#7ccf6a', '#6fc2c9', '#c9a24f']

// Tiles a slime may never stand on (tiles.ts): roads, places and their neighbours, the house, trees.
const open = (x: number, z: number) => clear(Math.round(x), Math.round(z))
// Homes: open meadow, far from the house, at least two tiles from any road or place.
const nearRoad = (i: number, j: number) => nearPath(i, j, 2)

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function placeHomes() {
  const random = rng(SEED)
  const tiles: { x: number; z: number }[] = []
  for (let i = -18; i <= 18; i++)
    for (let j = -18; j <= 18; j++) if (Math.hypot(i, j) >= HOME_AWAY && open(i, j) && isInland(i, j, 2) && !nearRoad(i, j)) tiles.push({ x: i, z: j })
  const homes: { x: number; z: number }[] = []
  while (homes.length < COUNT && tiles.length) {
    const t = tiles.splice(Math.floor(random() * tiles.length), 1)[0]
    if (homes.every((h) => Math.hypot(h.x - t.x, h.z - t.z) > 5)) homes.push(t)
  }
  return homes
}
export const slimeHomes = placeHomes()

// Each slime's state, in plain arrays: no allocation per frame.
const n = slimeHomes.length
const sx = new Float32Array(n)
const sz = new Float32Array(n)
const hp = new Float32Array(n)
const hopT = new Float32Array(n).fill(-1) // seconds into the current hop; -1 = sitting
const restT = new Float32Array(n) // seconds left sitting
const dirX = new Float32Array(n)
const dirZ = new Float32Array(n)
const speed = new Float32Array(n)
const knockX = new Float32Array(n)
const knockZ = new Float32Array(n)
const flash = new Float32Array(n) // seconds of white flash after a hit
const goneAt = new Float32Array(n).fill(-1) // clock time when popped; -1 = here
for (let k = 0; k < n; k++) {
  sx[k] = slimeHomes[k].x
  sz[k] = slimeHomes[k].z
  hp[k] = HP
  restT[k] = Math.random() * 2
}

const bodyGeometry = new SphereGeometry(0.28, 12, 8).translate(0, 0.28, 0)
const eyeGeometry = new SphereGeometry(0.035, 6, 4)
const eyeMaterial = new MeshLambertMaterial({ color: '#1f1f1f' })
const WHITE = new Color('#ffffff')

export function Slimes() {
  const groups = useRef<(Group | null)[]>([])
  const bodies = useRef(slimeHomes.map((_, k) => new MeshLambertMaterial({ color: COLORS[k % COLORS.length], flatShading: true })))
  const base = useRef(slimeHomes.map((_, k) => new Color(COLORS[k % COLORS.length])))

  useEffect(() => {
    const removers = slimeHomes.map((_, k) => {
      // A hittable that follows the slime: its x and z are kept up to date each frame below.
      const h = {
        x: sx[k],
        z: sz[k],
        r: 0.28,
        hit: (power: number, dx: number, dz: number) => {
          if (goneAt[k] >= 0) return
          hp[k] -= power
          flash[k] = 0.15
          knockX[k] = dx * KNOCK
          knockZ[k] = dz * KNOCK
          hopT[k] = -1
          restT[k] = 0.5
          if (hp[k] <= 0) {
            goneAt[k] = performance.now() / 1000
            pop()
            burst(sx[k], sz[k], 8, base.current[k])
            maybeDrop(sx[k], sz[k], DROP.heart, DROP.shell)
          }
        },
      }
      hittable[k] = h
      return addHittable(h)
    })
    return () => removers.forEach((r) => r())
  }, [])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1)
    const on = useSettings.getState().slimes
    const outdoors = useGame.getState().scene === 'world'
    const paused = busy() || !outdoors
    const now = performance.now() / 1000
    for (let k = 0; k < n; k++) {
      const g = groups.current[k]
      if (!g) continue
      // Popped (or switched off): away until it's time, and the player is far from home.
      if (goneAt[k] >= 0 || !on) {
        g.visible = false
        hittable[k].x = 1e6 // out of reach
        if (on && now - goneAt[k] > RESPAWN && (slimeHomes[k].x - playerPos.x) ** 2 + (slimeHomes[k].z - playerPos.z) ** 2 > RESPAWN_AWAY ** 2) {
          goneAt[k] = -1
          hp[k] = HP
          sx[k] = slimeHomes[k].x
          sz[k] = slimeHomes[k].z
        }
        continue
      }
      g.visible = true
      if (!paused) step(k, dt)
      hittable[k].x = sx[k]
      hittable[k].z = sz[k]

      // Draw: a squashy hop, and a white flash when hit.
      const t = hopT[k] >= 0 ? hopT[k] / HOP_TIME : 0
      const motion = reducedMotion() ? 0.3 : 1
      const lift = Math.sin(Math.PI * t) * 0.28 * motion
      const squash = hopT[k] >= 0 ? 1 + 0.18 * Math.sin(Math.PI * t) * motion : 1 - 0.08 * Math.abs(Math.sin(clock.elapsedTime * 3 + k)) * motion
      g.position.set(sx[k], lift, sz[k])
      g.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
      g.rotation.y = Math.atan2(dirX[k], dirZ[k])
      flash[k] = Math.max(0, flash[k] - dt)
      bodies.current[k].color.copy(flash[k] > 0 ? WHITE : base.current[k])
    }
  })

  return (
    <>
      {slimeHomes.map((_, k) => (
        <group
          key={k}
          ref={(el) => {
            groups.current[k] = el
          }}
        >
          <mesh geometry={bodyGeometry} material={bodies.current[k]} />
          <mesh geometry={eyeGeometry} material={eyeMaterial} position={[-0.09, 0.34, 0.24]} />
          <mesh geometry={eyeGeometry} material={eyeMaterial} position={[0.09, 0.34, 0.24]} />
        </group>
      ))}
    </>
  )
}

// The hittable for each slime, moved with it every frame.
const hittable: { x: number; z: number; r: number; hit: (power: number, dx: number, dz: number) => void }[] = []

// One slime's move this frame: sliding off a knock, hopping, or sitting and choosing where next.
function step(k: number, dt: number) {
  const px = playerPos.x - sx[k]
  const pz = playerPos.z - sz[k]
  const toPlayer = Math.sqrt(px * px + pz * pz)

  // A knock from the sword slides it back, easing off; it never slides onto a road.
  if (knockX[k] !== 0 || knockZ[k] !== 0) {
    move(k, knockX[k] * dt, knockZ[k] * dt)
    const ease = Math.exp(-8 * dt)
    knockX[k] *= ease
    knockZ[k] *= ease
    if (Math.abs(knockX[k]) + Math.abs(knockZ[k]) < 0.05) knockX[k] = knockZ[k] = 0
  }

  if (hopT[k] >= 0) {
    hopT[k] += dt
    move(k, dirX[k] * speed[k] * dt, dirZ[k] * speed[k] * dt)
    if (hopT[k] >= HOP_TIME) {
      hopT[k] = -1
      restT[k] = REST[0] + Math.random() * (REST[1] - REST[0])
    }
  } else {
    restT[k] -= dt
    if (restT[k] <= 0) {
      // Hop toward the player if they're near (and the slime's not too far from home), else wander.
      const hx = slimeHomes[k].x - sx[k]
      const hz = slimeHomes[k].z - sz[k]
      const fromHome = Math.sqrt(hx * hx + hz * hz)
      let tx: number
      let tz: number
      if (toPlayer < SEE && fromHome < LEASH + 1) {
        tx = px
        tz = pz
        speed[k] = CHASE_SPEED
      } else if (fromHome > LEASH) {
        tx = hx
        tz = hz
        speed[k] = HOP_SPEED
      } else {
        const a = Math.random() * Math.PI * 2
        tx = Math.cos(a)
        tz = Math.sin(a)
        speed[k] = HOP_SPEED
      }
      const len = Math.sqrt(tx * tx + tz * tz) || 1
      dirX[k] = tx / len
      dirZ[k] = tz / len
      hopT[k] = 0
    }
  }

  // A bump: half a heart, and the player is knocked away from the slime (not while rolling through).
  if (toPlayer < BUMP && harm.invuln <= 0 && playerRoll.p < 0) damage(1, px, pz)
}

// Moves a slime, unless that would put it on a road, by a place, under the house or off the island.
function move(k: number, dx: number, dz: number) {
  if (open(sx[k] + dx, sz[k] + dz)) {
    sx[k] += dx
    sz[k] += dz
  } else {
    hopT[k] = hopT[k] >= 0 ? HOP_TIME : hopT[k] // land at once
    knockX[k] = knockZ[k] = 0
  }
}
