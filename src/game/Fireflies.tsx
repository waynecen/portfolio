import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, PointsMaterial, type Points } from 'three'
import { BOUND, isInland } from './Island'
import { inHouse } from './pois'
import { winter } from './season'
import { sky } from './sky'

// Night on the island: small warm lights drifting low over the grass, each wandering round its own
// spot and twinkling on and off. One set of points, faded in and out with the night weather.

const COUNT = 55
const WANDER = 0.5 // how far each one drifts from its spot
const HEIGHT = 0.45 // average height above the grass
const BOB = 0.25 // how far it rises and sinks
const SIZE = 0.3
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

// Each firefly's spot (a random inland grass tile, not under the house) and its own rhythm.
const spots: { x: number; z: number; phase: number; speed: number }[] = []
const n = BOUND
while (spots.length < COUNT) {
  const i = Math.round((Math.random() * 2 - 1) * n)
  const j = Math.round((Math.random() * 2 - 1) * n)
  if (!isInland(i, j, 1) || inHouse(i, j)) continue
  spots.push({ x: i + Math.random() - 0.5, z: j + Math.random() - 0.5, phase: Math.random() * 100, speed: 0.6 + Math.random() * 0.6 })
}

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
    const glow = reduced ? 1 : 0.25 + 0.75 * Math.max(0, Math.sin(a * 1.9))
    colors[k * 3] = colors[k * 3 + 1] = colors[k * 3 + 2] = glow
  }
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
}
place(0)

export function Fireflies() {
  const points = useRef<Points>(null)

  useFrame(({ clock }) => {
    const night = sky.weather.night
    if (!points.current) return
    points.current.visible = night > 0
    if (night <= 0) return
    material.opacity = night
    if (!reduced) place(clock.elapsedTime)
  })

  if (winter) return null // no fireflies in the cold
  // Not culled: they're spread over the whole island and move every frame.
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
