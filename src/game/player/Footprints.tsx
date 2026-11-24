import { useRef } from 'react'
import { CircleGeometry, Color, InstancedBufferAttribute, MeshBasicMaterial, Object3D, type InstancedMesh } from 'three'
import { useSceneFrame } from '../core/sceneFrame'
import { fresh, LIFE, POOL, printClock, prints } from './prints'

// Footprints on the dirt paths and in the snow: a small dark oval left at each step (Player.tsx calls
// addPrint), turned with the player and set a little to the side of the foot that stepped. They fade
// away over a few seconds (longer in snow). A fixed pool of instances, reused oldest first; each
// instance's fade is its own attribute, so nothing is allocated per step or per frame.

const SPREAD = 0.09 // how far left or right of the path each foot falls
const OPACITY = 0.6
const TINT = { road: new Color('#5c4529'), snow: new Color('#7387a6') } // packed earth; the blue of a dent in snow

const geometry = new CircleGeometry(1, 10).rotateX(-Math.PI / 2).scale(0.07, 1, 0.115)
const fade = new InstancedBufferAttribute(new Float32Array(POOL), 1)
geometry.setAttribute('aFade', fade)
const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: OPACITY, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
material.onBeforeCompile = (shader) => {
  shader.vertexShader = 'attribute float aFade;\nvarying float vFade;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vFade = aFade;')
  shader.fragmentShader = 'varying float vFade;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', 'diffuseColor.a *= vFade;\n  #include <opaque_fragment>')
}

const dummy = new Object3D()

export function Footprints() {
  const mesh = useRef<InstancedMesh>(null)

  useSceneFrame('world', ({ clock }) => {
    const now = (printClock.now = clock.elapsedTime)
    const m = mesh.current
    if (!m) return
    if (fresh.length) {
      for (const k of fresh) {
        const p = prints[k]
        // Set to the side of the path, across the way the player faces.
        dummy.position.set(p.x + Math.cos(p.heading) * SPREAD * p.side, 0.03, p.z - Math.sin(p.heading) * SPREAD * p.side)
        dummy.rotation.set(0, p.heading, 0)
        dummy.updateMatrix()
        m.setMatrixAt(k, dummy.matrix)
        m.setColorAt(k, TINT[p.surface])
      }
      fresh.length = 0
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    for (let k = 0; k < POOL; k++) {
      const age = (now - prints[k].born) / LIFE[prints[k].surface]
      fade.array[k] = age < 0 || age >= 1 ? 0 : 1 - age * age // holds, then goes quickly
    }
    fade.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geometry, material, POOL]} frustumCulled={false} userData={{ noShadow: true }} />
}
