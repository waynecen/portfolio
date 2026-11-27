import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { WebGLRenderTarget, type DirectionalLight, type Object3D, type PointLight } from 'three'
import { warm } from './warm'

/** Shows every hidden area for one frame when warm.ts asks, so its shaders are built then; mount once, in the Canvas. */
export function WarmUp() {
  const { scene, camera, gl } = useThree()
  const shown = useRef<Object3D[]>([])
  // Before the frame is drawn (PostFX.tsx draws at priority 1)... Every shadow map is redrawn too,
  // so its depth shaders are built: the sun's isn't redrawn indoors, where the game starts.
  useFrame(() => {
    if (!warm.done) return
    for (const o of scene.children) {
      if (o.visible) continue
      o.visible = true
      shown.current.push(o)
    }
    scene.traverse((o) => {
      const light = o as DirectionalLight | PointLight
      if (light.isLight && light.castShadow) light.shadow.needsUpdate = true
    })
  })
  // ...and after: everything out of the camera's view built as well (the frame culled it), into a render
  // target like the composer's, so the shaders match what it draws (linear output, not the screen's).
  // Then hidden again, as React left them.
  useFrame(() => {
    const done = warm.done
    if (!done) return
    const target = new WebGLRenderTarget(1, 1)
    const before = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.compile(scene, camera)
    gl.setRenderTarget(before)
    target.dispose()
    for (const o of shown.current) o.visible = false
    shown.current.length = 0
    warm.done = null
    done()
  }, 2)
  return null
}
