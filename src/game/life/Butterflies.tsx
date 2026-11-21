import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { DoubleSide, MeshLambertMaterial, PlaneGeometry, type Group } from 'three'
import { BUGS, GOLDFLY, MORPHO, tryCatch, type BugId } from './bugs'
import { fireflyNear, catchFirefly } from './Fireflies'
import { register, type Interactable } from '../core/interact'
import { isInland } from '../world/Island'
import { winter } from '../world/season'
import { reducedMotion } from '../core/settings'
import { sky } from '../world/sky'
import { playerPos } from '../core/state'
import { useGame } from '../core/store'

// Butterflies flutter over the meadows on dry days (not in winter), each round its own patch of
// grass, wings flapping. One "Catch" interactable follows whichever bug is nearest the player:
// a butterfly by day, a firefly at night (Fireflies.tsx). Catching is in bugs.ts. A caught or
// startled butterfly flies off and comes back a while later somewhere else.

const COUNT = 6
const RANGE = 1.1 // how close to a bug the player must be to catch it
const WANDER = 1.6 // how far a butterfly strays from its patch
const HEIGHT = 0.7
const AWAY = 25 // seconds before a caught or startled butterfly is back
const BLUE = BUGS.find((b) => b.id === 'morpho')!.color
const WHITE = BUGS.find((b) => b.id === 'white')!.color

// Each butterfly's patch, kind and rhythm. Patches are inland grass anywhere on the island.
const butterflies = Array.from({ length: COUNT }, () => newButterfly())
function newButterfly() {
  let x = 0
  let z = 0
  for (let tries = 0; tries < 200; tries++) {
    x = Math.round((Math.random() * 2 - 1) * 16)
    z = Math.round((Math.random() * 2 - 1) * 16)
    if (isInland(x, z, 1) && Math.hypot(x, z) > 4) break
  }
  return {
    homeX: x,
    homeZ: z,
    x,
    z,
    kind: (Math.random() < MORPHO ? 'morpho' : 'white') as BugId,
    phase: Math.random() * 100,
    goneUntil: 0,
  }
}

const wing = new PlaneGeometry(0.14, 0.11).translate(0.07, 0, 0).rotateX(-Math.PI / 2)
const materials = { white: new MeshLambertMaterial({ color: WHITE, side: DoubleSide }), morpho: new MeshLambertMaterial({ color: BLUE, side: DoubleSide }) }

export function Butterflies() {
  const groups = useRef<(Group | null)[]>([])
  const left = useRef<(Group | null)[]>([])
  const right = useRef<(Group | null)[]>([])
  // The one interactable, moved each frame to the nearest catchable bug (or parked far away).
  const target = useRef<{ kind: 'butterfly' | 'firefly'; index: number }>({ kind: 'butterfly', index: -1 })
  const item = useRef<Interactable>({
    x: 1e6,
    z: 1e6,
    range: RANGE,
    prompt: 'Catch',
    onInteract: () => {
      const t = target.current
      if (t.index < 0) return
      if (t.kind === 'firefly') {
        tryCatch(Math.random() < GOLDFLY ? 'goldfly' : 'firefly')
        catchFirefly(t.index) // caught or startled, it goes dark for a while
        return
      }
      const b = butterflies[t.index]
      tryCatch(b.kind)
      b.goneUntil = performance.now() / 1000 + AWAY // caught or startled, it's off for a while
    },
  })
  useEffect(() => register(item.current), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const now = performance.now() / 1000
    const outdoors = useGame.getState().scene === 'world'
    const flying = !winter && sky.weather.rain < 0.5 && sky.weather.night < 0.5
    let best = RANGE * RANGE
    target.current.index = -1
    for (let k = 0; k < COUNT; k++) {
      const g = groups.current[k]
      if (!g) continue
      const b = butterflies[k]
      if (b.goneUntil && now > b.goneUntil) Object.assign(b, newButterfly(), { kind: b.kind }) // a new patch; same wings
      g.visible = flying && now > b.goneUntil
      if (!g.visible) continue
      // A lazy, looping path round its patch, bobbing up and down.
      const a = t * 0.5 + b.phase
      b.x = b.homeX + Math.sin(a) * WANDER * Math.cos(a * 0.37)
      b.z = b.homeZ + Math.sin(a * 0.73) * WANDER
      const still = reducedMotion()
      g.position.set(b.x, HEIGHT + (still ? 0 : Math.sin(t * 2.3 + b.phase) * 0.12), b.z)
      g.rotation.y = still ? 0 : a * 1.3
      const flap = still ? 0.4 : 0.2 + Math.abs(Math.sin(t * 14 + b.phase)) * 1.1
      left.current[k]!.rotation.z = flap
      right.current[k]!.rotation.z = -flap
      const d = (b.x - playerPos.x) ** 2 + (b.z - playerPos.z) ** 2
      if (outdoors && d < best) {
        best = d
        target.current.kind = 'butterfly'
        target.current.index = k
      }
    }
    // At night, the nearest firefly instead.
    if (outdoors && target.current.index < 0) {
      const f = fireflyNear(playerPos.x, playerPos.z, RANGE)
      if (f >= 0) {
        target.current.kind = 'firefly'
        target.current.index = f
      }
    }
    const it = item.current
    if (target.current.index < 0) it.x = it.z = 1e6
    else if (target.current.kind === 'butterfly') {
      it.x = butterflies[target.current.index].x
      it.z = butterflies[target.current.index].z
    } else {
      // Close enough to count; the firefly itself drifts about here.
      it.x = playerPos.x
      it.z = playerPos.z
    }
  })

  return (
    <>
      {butterflies.map((b, k) => (
        <group
          key={k}
          ref={(el) => {
            groups.current[k] = el
          }}
          visible={false}
        >
          <group
            ref={(el) => {
              left.current[k] = el
            }}
          >
            <mesh geometry={wing} material={materials[b.kind === 'morpho' ? 'morpho' : 'white']} />
          </group>
          <group
            ref={(el) => {
              right.current[k] = el
            }}
            rotation-y={Math.PI}
          >
            <mesh geometry={wing} material={materials[b.kind === 'morpho' ? 'morpho' : 'white']} />
          </group>
        </group>
      ))}
    </>
  )
}
