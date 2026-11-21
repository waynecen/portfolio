import { useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, PointsMaterial, type Points } from 'three'
import { BOUND, isInland } from '../world/Island'
import { inHouse } from '../world/pois'
import { winter } from '../world/season'
import { sky } from '../world/sky'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'

// Night on the island: small warm lights drifting low over the grass, each wandering round its own
// spot and twinkling on and off. One set of points, faded in and out with the night weather.

const COUNT = 55
const WANDER = 0.5 // how far each one drifts from its spot
const HEIGHT = 0.45 // average height above the grass
const BOB = 0.25 // how far it rises and sinks
const SIZE = 0.3

// Each firefly's spot (a random inland grass tile, not under the house) and its own rhythm.
const spots: { x: number; z: number; phase: number; speed: number }[] = []
const n = BOUND
while (spots.length < COUNT) {
  const i = Math.round((Math.random() * 2 - 1) * n)
  const j = Math.round((Math.random() * 2 - 1) * n)
  if (!isInland(i, j, 1) || inHouse(i, j)) continue
  spots.push({ x: i + Math.random() - 0.5, z: j + Math.random() - 0.5, phase: Math.random() * 100, speed: 0.6 + Math.random() * 0.6 })
}

const AWAY = 30 // seconds a caught firefly stays gone (Butterflies.tsx catches them)
const goneUntil = new Float32Array(COUNT) // clock time each caught one comes back
const positions = new Float32Array(COUNT * 3)
const colors = new Float32Array(COUNT * 3) // brightness per firefly; additive, so dark = invisible
const geometry = new BufferGeometry()
geometry.setAttribute('position', new BufferAttribute(positions, 3))
geometry.setAttribute('color', new BufferAttribute(colors, 3))
const material = new PointsMaterial({
  color: '#ffe680', size: SIZE, vertexColors: true, transparent: true, opacity: 0,
  blending: AdditiveBlending, depthWrite: false, fog: false, // they glow through the night haze
})

function place(t: number) {
  for (let k = 0; k < COUNT; k++) {
    const s = spots[k]
    const a = t * s.speed + s.phase
    positions[k * 3] = s.x + Math.sin(a * 0.7) * WANDER
    positions[k * 3 + 1] = HEIGHT + Math.sin(a * 1.3) * BOB
    positions[k * 3 + 2] = s.z + Math.cos(a * 0.5) * WANDER
    const glow = performance.now() / 1000 < goneUntil[k] ? 0 : reducedMotion() ? 1 : 0.25 + 0.75 * Math.max(0, Math.sin(a * 1.9))
    colors[k * 3] = colors[k * 3 + 1] = colors[k * 3 + 2] = glow
  }
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
}
place(0)

export function Fireflies() {
  const points = useRef<Points>(null)

  useSceneFrame('world', ({ clock }) => {
    const night = sky.weather.night
    if (!points.current) return
    points.current.visible = night > 0
    if (night <= 0) return
    material.opacity = night
    place(reducedMotion() ? 0 : clock.elapsedTime) // held still with reduced motion, but caught ones still go dark
  })

  if (winter) return null // no fireflies in the cold
  // Not culled: they're spread over the whole island and move every frame.
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}

/** The nearest firefly within `range` of (x, z) that's lit and not caught, or -1 (none, or it's day). */
export function fireflyNear(x: number, z: number, range: number): number {
  if (winter || sky.weather.night < 0.5) return -1
  const now = performance.now() / 1000
  let best = range * range
  let found = -1
  for (let k = 0; k < COUNT; k++) {
    if (now < goneUntil[k]) continue
    const d = (positions[k * 3] - x) ** 2 + (positions[k * 3 + 2] - z) ** 2
    if (d < best) {
      best = d
      found = k
    }
  }
  return found
}

/** Firefly k was caught (or startled): it's dark for a while. */
export function catchFirefly(k: number) {
  goneUntil[k] = performance.now() / 1000 + AWAY
}
