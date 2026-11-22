import { useLoader } from '@react-three/fiber'
import { MeshLambertMaterial, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

// Loading the models `npm run models` writes to public/models (meshopt-compressed; see docs/CHARACTER.md).
// Only lazily loaded components import this, so the loader stays out of the game chunk until a model is shown.

/** Loads a .glb from public/, suspending until it's ready (wrap the user in <Suspense>). Cached by URL. */
export const useGLB = (url: string) => useLoader(GLTFLoader, url, (loader) => loader.setMeshoptDecoder(MeshoptDecoder))

// The island is lit with Lambert materials; a model's PBR ones would look out of place (and cost
// more), so each keeps its texture and colour on a Lambert material instead.
export function toLambert(material: Material): Material {
  const m = material as MeshStandardMaterial
  return new MeshLambertMaterial({
    map: m.map ?? null,
    color: m.color ?? 0xffffff,
    vertexColors: m.vertexColors,
    transparent: m.transparent,
    alphaTest: m.alphaTest,
    side: m.side,
  })
}

/**
 * Puts every mesh under root on Lambert materials (toLambert), and returns them. Each gets its own
 * texture as an emissive map, at 0: raise their `emissiveIntensity` for a soft fill that shows the
 * model's true colours from every side, the way it looks in Tripo's preview, whatever the scene's light.
 */
export function lambertAll(root: Object3D): MeshLambertMaterial[] {
  const all: MeshLambertMaterial[] = []
  const swap = (material: Material) => {
    const m = toLambert(material) as MeshLambertMaterial
    m.emissive.set(m.map ? 0xffffff : m.color)
    m.emissiveMap = m.map
    m.emissiveIntensity = 0
    all.push(m)
    return m
  }
  root.traverse((o) => {
    const mesh = o as Mesh
    if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
  })
  return all
}
