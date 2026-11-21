import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, MeshBasicMaterial, Object3D, OctahedronGeometry, type InstancedMesh } from 'three'
import { useGame } from '../core/store'
import { reducedMotion } from '../core/settings'

// A few gold glints circling above whatever the player can use right now (the focused
// interactable: a station, the sign, the mailbox, the record player), so it's clear what E / A
// will act on. Hidden while talking or in a panel. One instanced mesh; unlit, so it reads by day
// and by night alike.

const COUNT = 5
const HEIGHT = 1.55 // above the ground, over the top of every prop
const RADIUS = 0.32 // how wide they circle
const SPIN = 1.4 // radians per second round the circle
const SIZE = 0.075 // a glint's radius at its brightest
const FADE = 10 // how quickly they appear and vanish (damp rate)

const geometry = new OctahedronGeometry(1, 0)
const material = new MeshBasicMaterial({ color: '#ffc21f' })
const dummy = new Object3D()

export function Sparkle() {
  const mesh = useRef<InstancedMesh>(null)
  const s = useRef({ show: 0, x: 0, z: 0 }).current

  useFrame(({ clock }, delta) => {
    const m = mesh.current
    if (!m) return
    const g = useGame.getState()
    const focus = g.dialogue || g.panel ? null : g.focus
    if (focus) {
      s.x = focus.x
      s.z = focus.z
    }
    s.show = MathUtils.damp(s.show, focus ? 1 : 0, FADE, Math.min(delta, 0.1))
    m.visible = s.show > 0.01
    if (!m.visible) return
    const t = reducedMotion() ? 0 : clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2 + t * SPIN
      // Each glint swells and shrinks on its own beat, so they twinkle rather than pulse together.
      const twinkle = reducedMotion() ? 0.8 : 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6 + i * 1.7))
      dummy.position.set(s.x + Math.cos(a) * RADIUS, HEIGHT + Math.sin(t * 2 + i) * 0.06, s.z + Math.sin(a) * RADIUS)
      dummy.rotation.set(0, a, 0)
      dummy.scale.set(SIZE * twinkle * s.show, SIZE * 1.8 * twinkle * s.show, SIZE * twinkle * s.show) // tall, like a star's glint
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geometry, material, COUNT]} frustumCulled={false} visible={false} />
}
