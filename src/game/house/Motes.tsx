import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, PointsMaterial } from 'three'
import { useSceneFrame } from '../core/sceneFrame'
import { reducedMotion } from '../core/settings'
import { INTERIOR, ROOM } from '../world/layout'
import { sky } from '../world/sky'

// Dust motes drifting in the room's light: tiny warm specks that wander slowly and catch the
// lantern at night. Positions live in one preallocated buffer, moved in place each frame.
// With reduced motion they hang still.

const COUNT = 60
const LOW = 0.3 // the band of air they drift in, heights
const HIGH = 2.2
const SPEED = 0.06 // units per second, at most
const SIZE = 0.075 // world units
const OPACITY = { day: 0.35, night: 0.7 }

function dot() {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 32, 32)
  return new CanvasTexture(c)
}

const material = new PointsMaterial({ map: dot(), color: '#ffe2b0', size: SIZE, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: OPACITY.day })

const hx = ROOM.hx - 0.6
const hz = ROOM.hz - 0.6

export function Motes() {
  const { geometry, position, phase } = useMemo(() => {
    const position = new Float32Array(COUNT * 3)
    const phase = new Float32Array(COUNT)
    for (let k = 0; k < COUNT; k++) {
      position[k * 3] = INTERIOR.x + (Math.random() * 2 - 1) * hx
      position[k * 3 + 1] = LOW + Math.random() * (HIGH - LOW)
      position[k * 3 + 2] = INTERIOR.z + (Math.random() * 2 - 1) * hz
      phase[k] = Math.random() * 100
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(position, 3))
    return { geometry, position, phase }
  }, [])

  useSceneFrame('house', ({ clock }, delta) => {
    material.opacity = OPACITY.day + (OPACITY.night - OPACITY.day) * sky.weather.night
    if (reducedMotion()) return
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    for (let k = 0; k < COUNT; k++) {
      const p = phase[k]
      // A slow wander: each speck follows its own pair of sines, and sinks a little, then rises.
      position[k * 3] += Math.sin(t * 0.21 + p) * SPEED * dt
      position[k * 3 + 1] += Math.sin(t * 0.13 + p * 1.3) * SPEED * 0.6 * dt
      position[k * 3 + 2] += Math.cos(t * 0.17 + p * 0.7) * SPEED * dt
      // Keep them in the room's air, wrapping round rather than piling up at a wall.
      const x = position[k * 3] - INTERIOR.x
      const z = position[k * 3 + 2] - INTERIOR.z
      if (x > hx) position[k * 3] -= 2 * hx
      else if (x < -hx) position[k * 3] += 2 * hx
      if (z > hz) position[k * 3 + 2] -= 2 * hz
      else if (z < -hz) position[k * 3 + 2] += 2 * hz
      position[k * 3 + 1] = Math.min(HIGH, Math.max(LOW, position[k * 3 + 1]))
    }
    geometry.attributes.position.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} userData={{ noShadow: true }} />
}
