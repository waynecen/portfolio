import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { BoxGeometry, MeshBasicMaterial, Object3D, type InstancedMesh } from 'three'
import { useFishing } from './fishing'
import { guide, PEEK, pointMe, STREAKS_FOR } from './guide'
import { isTouch } from './quality'
import { playerPos, playerVel } from './state'
import { useGame } from './store'
import { keyName } from './keymap'

// The wind streaks of "point me somewhere" (guide.ts): thin white strokes that rise around the
// player and fly off toward the place, a few at a time. One instanced mesh from a fixed pool;
// nothing is allocated per frame. Also the Where to? chip, the touch screen's way to ask.

const COUNT = 12 // streaks in one gust, set off evenly over STREAKS_FOR seconds
const LIFE = 1 // seconds each one flies
const SPEED = 4.5 // units per second
const LENGTH = 0.6 // longest a streak gets, mid-flight
const SPREAD = 0.7 // how far either side of the player they start

const geometry = new BoxGeometry(0.025, 0.025, 1)
const material = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false })
const start = new Float32Array(COUNT * 3) // x, y, z where each set off
const dir = new Float32Array(COUNT * 2) // its heading (x, z), unit length
const born = new Float32Array(COUNT).fill(-1) // guide.t when it set off; -1 = not yet
const dummy = new Object3D()

export function GuideWind() {
  const mesh = useRef<InstancedMesh>(null)

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    if (!guide.on) {
      if (m.visible) m.visible = false
      return
    }
    m.visible = true
    const prev = guide.t
    guide.t += Math.min(delta, 0.1)
    const t = guide.t

    // Walking off ends the look early; the camera comes back to the player.
    if (guide.peek && (t > PEEK || (t > 0.3 && playerVel.speed > 0.1))) guide.peek = false

    for (let k = 0; k < COUNT; k++) {
      // Set off when its moment comes, from beside the player, heading for the place.
      const at = (k / COUNT) * STREAKS_FOR
      if (prev <= at && t > at) {
        const dx = guide.x - playerPos.x
        const dz = guide.z - playerPos.z
        const len = Math.hypot(dx, dz) || 1
        const side = (Math.random() * 2 - 1) * SPREAD
        dir[k * 2] = dx / len
        dir[k * 2 + 1] = dz / len
        start[k * 3] = playerPos.x - (dz / len) * side
        start[k * 3 + 1] = 0.4 + Math.random() * 0.8
        start[k * 3 + 2] = playerPos.z + (dx / len) * side
        born[k] = at
      }
      const age = born[k] < 0 ? -1 : t - born[k]
      if (age < 0 || age > LIFE) {
        dummy.scale.set(0, 0, 0)
      } else {
        const d = age * SPEED
        dummy.position.set(start[k * 3] + dir[k * 2] * d, start[k * 3 + 1], start[k * 3 + 2] + dir[k * 2 + 1] * d)
        dummy.rotation.set(0, Math.atan2(dir[k * 2], dir[k * 2 + 1]), 0)
        dummy.scale.set(1, 1, LENGTH * Math.sin((Math.PI * age) / LIFE)) // grows, then thins away
      }
      dummy.updateMatrix()
      m.setMatrixAt(k, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true

    // Done once the last streak has flown and the camera is back.
    if (t > STREAKS_FOR + LIFE && !guide.peek) {
      guide.on = false
      born.fill(-1)
    }
  })

  return <instancedMesh ref={mesh} args={[geometry, material, COUNT]} frustumCulled={false} visible={false} />
}

/** The Where to? chip at the top left, under the hearts. Hidden while something else has the player's attention. */
export function GuideButton() {
  const away = useGame((s) => s.dialogue !== null || s.panel !== null || s.fading || s.editing)
  const fishing = useFishing((s) => s.phase !== 'idle')
  if (away || fishing) return null
  return (
    <button type="button" className="guide-toggle" onClick={pointMe}>
      {!isTouch && <kbd>{keyName('guide')}</kbd>} Where to?
    </button>
  )
}
