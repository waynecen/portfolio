import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { BufferAttribute, BufferGeometry, PointsMaterial, type Points } from 'three'
import { detectTier } from './quality'
import { winter } from './season'
import { sky } from './sky'
import { playerPos, teleport } from './state'
import { useGame } from './store'
import { reducedMotion } from './settings'

// Winter's snowfall: flakes drifting down round the player, swaying as they fall, drawn as one set
// of points. Like the rain, each flake starts again at the top somewhere near the player when it
// lands. It snows lightly all day, and properly when the rain would come (the afternoon slot).

const COUNT = detectTier() === 'low' ? 300 : 700
const LIGHT = 0.35 // share of the flakes falling outside the snowy afternoon
const SPREAD_X = 15 // half-width of the area round the player that snow falls in
const SPREAD_Z = 13 // half-depth; the camera sees further toward the back
const TOP = 9 // flakes start this high
const SPEED = 1.3 // fall speed, units/s
const SWAY = 0.5 // sideways drift, units/s
const SIZE = 0.09

const positions = new Float32Array(COUNT * 3)
const phase = new Float32Array(COUNT) // each flake's own sway
for (let n = 0; n < COUNT; n++) phase[n] = Math.random() * Math.PI * 2
const geometry = new BufferGeometry()
geometry.setAttribute('position', new BufferAttribute(positions, 3))
const material = new PointsMaterial({ color: '#ffffff', size: SIZE, transparent: true, opacity: 0.9, depthWrite: false })

function drop(n: number, y: number) {
  positions[n * 3] = playerPos.x + (Math.random() * 2 - 1) * SPREAD_X
  positions[n * 3 + 1] = y
  positions[n * 3 + 2] = playerPos.z + (Math.random() * 2 - 1) * SPREAD_Z
}

export function Snow() {
  const points = useRef<Points>(null)
  const started = useRef(false)

  useFrame(({ clock }, delta) => {
    if (!points.current) return
    if (useGame.getState().scene !== 'world' || teleport.pending) {
      started.current = false // scatter again round wherever the player comes out
      return
    }
    // Fewer flakes on a light day: only the first part of the pool is drawn.
    geometry.setDrawRange(0, Math.round(COUNT * (LIGHT + (1 - LIGHT) * sky.weather.rain)))

    if (!started.current) {
      for (let n = 0; n < COUNT; n++) drop(n, Math.random() * TOP)
      started.current = true
    } else if (!reducedMotion()) {
      const dt = Math.min(delta, 0.1)
      const t = clock.elapsedTime
      for (let n = 0; n < COUNT; n++) {
        const k = n * 3
        const y = positions[k + 1] - SPEED * dt
        if (y < 0) {
          drop(n, y + TOP)
          continue
        }
        positions[k + 1] = y
        positions[k] += Math.sin(t * 1.3 + phase[n]) * SWAY * dt
        positions[k + 2] += Math.cos(t * 0.9 + phase[n]) * SWAY * 0.5 * dt
      }
    }
    geometry.attributes.position.needsUpdate = true
  })

  if (!winter) return null
  // Not culled: the flakes move every frame, so a bounding sphere would always be stale.
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
