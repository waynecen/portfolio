import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, MeshBasicMaterial, Object3D, RingGeometry, type InstancedMesh, type LineSegments } from 'three'
import { isLand } from './land'
import { detectTier } from '../core/quality'
import { winter } from './season'
import { sky } from './sky'
import { playerPos, teleport } from '../core/state'
import { useGame } from '../core/store'
import { reducedMotion } from '../core/settings'

// The afternoon shower: thin streaks falling round the player, drawn as one set of line segments.
// Each streak falls to the ground and starts again at the top somewhere near the player, so the
// rain follows you without a visible box. It fades in and out with the rain weather in sky.ts.
// Some streaks near the player splash as they land.
// In winter it snows instead.

const COUNT = detectTier() === 'low' ? 300 : 800
const SPREAD_X = 15 // half-width of the area round the player that rain falls in
const SPREAD_Z = 13 // half-depth; the camera sees further toward the back
const TOP = 9 // streaks start this high
const LENGTH = 0.45 // length of one streak
const SPEED = 14 // fall speed, units/s
const SLANT = 0.12 // sideways drift per unit fallen, as if blown by a light wind
const OPACITY = 0.5 // at full rain
// Splashes: a thin ring spreading where a streak lands, for some of the streaks near the player.
const SPLASHES = 48 // rings in the pool
const SPLASH_CHANCE = 0.2 // share of landings near the player that splash
const SPLASH_NEAR_X = 8 // only within this far of the player, where they can be seen
const SPLASH_NEAR_Z = 6
const SPLASH_LIFE = 0.28 // seconds a ring spreads for
const SPLASH_SIZE = 0.16 // its radius at the end

const positions = new Float32Array(COUNT * 6) // two points per streak
const geometry = new BufferGeometry()
geometry.setAttribute('position', new BufferAttribute(positions, 3))
const material = new LineBasicMaterial({ color: '#e4ecf2', transparent: true, opacity: 0, depthWrite: false })

const splashGeometry = new RingGeometry(0.75, 1, 12).rotateX(-Math.PI / 2)
const splashMaterial = new MeshBasicMaterial({
  color: '#e4ecf2', transparent: true, opacity: 0, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, // above the roads
})
const splashX = new Float32Array(SPLASHES)
const splashZ = new Float32Array(SPLASHES)
const splashAge = new Float32Array(SPLASHES).fill(SPLASH_LIFE)
let nextSplash = 0
const dummy = new Object3D()

function splash(x: number, z: number) {
  if (Math.random() > SPLASH_CHANCE) return
  if (Math.abs(x - playerPos.x) > SPLASH_NEAR_X || Math.abs(z - playerPos.z) > SPLASH_NEAR_Z) return
  if (!isLand(Math.round(x), Math.round(z))) return // over the sea it falls on past the cliffs
  splashX[nextSplash] = x
  splashZ[nextSplash] = z
  splashAge[nextSplash] = 0
  nextSplash = (nextSplash + 1) % SPLASHES
}

// Puts streak n at height y, somewhere round the player.
function drop(n: number, y: number) {
  const x = playerPos.x + (Math.random() * 2 - 1) * SPREAD_X
  const z = playerPos.z + (Math.random() * 2 - 1) * SPREAD_Z
  const k = n * 6
  positions[k] = x
  positions[k + 1] = y + LENGTH
  positions[k + 2] = z
  positions[k + 3] = x - SLANT * LENGTH
  positions[k + 4] = y
  positions[k + 5] = z
}

export function Rain() {
  const lines = useRef<LineSegments>(null)
  const rings = useRef<InstancedMesh>(null)
  const started = useRef(false)

  useFrame((_, delta) => {
    const rain = sky.weather.rain
    if (!lines.current) return
    if (useGame.getState().scene !== 'world' || teleport.pending) {
      started.current = false // scatter again round wherever the player comes out
      return
    }
    lines.current.visible = rain > 0
    if (rings.current) rings.current.visible = rain > 0
    if (rain <= 0) return
    material.opacity = OPACITY * rain
    splashMaterial.opacity = OPACITY * rain

    if (!started.current) {
      // Scatter the whole shower at every height on its first frame, so it doesn't arrive as one sheet.
      for (let n = 0; n < COUNT; n++) drop(n, Math.random() * TOP)
      started.current = true
    } else if (!reducedMotion()) {
      const fall = SPEED * Math.min(delta, 0.1)
      for (let n = 0; n < COUNT; n++) {
        const k = n * 6
        const y = positions[k + 4] - fall
        if (y < 0) {
          splash(positions[k + 3], positions[k + 5])
          drop(n, y + TOP)
          continue
        }
        positions[k + 1] -= fall
        positions[k + 4] = y
        positions[k] -= SLANT * fall
        positions[k + 3] -= SLANT * fall
      }
    }
    geometry.attributes.position.needsUpdate = true

    // Spread each live ring, then hide it.
    const r = rings.current
    if (r && !reducedMotion()) {
      const dt = Math.min(delta, 0.1)
      for (let i = 0; i < SPLASHES; i++) {
        if (splashAge[i] >= SPLASH_LIFE) {
          dummy.scale.setScalar(0)
        } else {
          splashAge[i] += dt
          dummy.scale.setScalar(SPLASH_SIZE * Math.min(1, splashAge[i] / SPLASH_LIFE))
        }
        dummy.position.set(splashX[i], 0.02, splashZ[i])
        dummy.updateMatrix()
        r.setMatrixAt(i, dummy.matrix)
      }
      r.instanceMatrix.needsUpdate = true
    }
  })

  if (winter) return null // it snows instead (Snow.tsx)
  // Not culled: the streaks move every frame, so a bounding sphere would always be stale.
  return (
    <>
      <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />
      <instancedMesh ref={rings} args={[splashGeometry, splashMaterial, SPLASHES]} frustumCulled={false} visible={false} />
    </>
  )
}
