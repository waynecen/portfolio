import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, type LineSegments } from 'three'
import { detectTier } from './quality'
import { winter } from './season'
import { sky } from './sky'
import { playerPos, teleport } from './state'
import { useGame } from './store'

// The afternoon shower: thin streaks falling round the player, drawn as one set of line segments.
// Each streak falls to the ground and starts again at the top somewhere near the player, so the
// rain follows you without a visible box. It fades in and out with the rain weather in sky.ts.
// In winter it snows instead.

const COUNT = detectTier() === 'low' ? 300 : 800
const SPREAD_X = 15 // half-width of the area round the player that rain falls in
const SPREAD_Z = 13 // half-depth; the camera sees further toward the back
const TOP = 9 // streaks start this high
const LENGTH = 0.45 // length of one streak
const SPEED = 14 // fall speed, units/s
const SLANT = 0.12 // sideways drift per unit fallen, as if blown by a light wind
const OPACITY = 0.5 // at full rain
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const positions = new Float32Array(COUNT * 6) // two points per streak
const geometry = new BufferGeometry()
geometry.setAttribute('position', new BufferAttribute(positions, 3))
const material = new LineBasicMaterial({ color: '#e4ecf2', transparent: true, opacity: 0, depthWrite: false })

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
  const started = useRef(false)

  useFrame((_, delta) => {
    const rain = sky.weather.rain
    if (!lines.current) return
    if (useGame.getState().scene !== 'world' || teleport.pending) {
      started.current = false // scatter again round wherever the player comes out
      return
    }
    lines.current.visible = rain > 0
    if (rain <= 0) return
    material.opacity = OPACITY * rain

    if (!started.current) {
      // Scatter the whole shower at every height on its first frame, so it doesn't arrive as one sheet.
      for (let n = 0; n < COUNT; n++) drop(n, Math.random() * TOP)
      started.current = true
    } else if (!reduced) {
      const fall = SPEED * Math.min(delta, 0.1)
      for (let n = 0; n < COUNT; n++) {
        const k = n * 6
        const y = positions[k + 4] - fall
        if (y < 0) {
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
  })

  if (winter) return null // it snows instead (Snow.tsx)
  // Not culled: the streaks move every frame, so a bounding sphere would always be stale.
  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />
}
