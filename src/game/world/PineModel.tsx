import { useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Float32BufferAttribute, MeshLambertMaterial, Object3D, type BufferGeometry, type InstancedMesh, type Mesh, type MeshStandardMaterial } from 'three'
import { useGLB } from '../core/gltf'
import { sway } from '../core/wind'
import { autumn, spring, winter } from './season'
import { canopyColor, drawn, GREEN, SWAY } from './treeLook'

// The Tripo pine (models-src/pine.glb, through npm run models), drawn once per tree as one instanced
// mesh. Loaded lazily; Trees.tsx shows the placeholder cones until it's here.

const URL = '/models/pine.glb'
const HEIGHT = 2 // the model is fitted to this height and WIDTH at scale 1: a touch wider than its own shape
const WIDTH = 1.1 // (about 2 : 1), so the trees read full from the camera; the cones were 1.65 by 1
const BRIGHT = 1.3 // the texture's foliage is darker than the island's palette; lifted to sit with it (not the snow)

// Its foliage is the only green in its texture (the trunk is orange-brown), so the season's colour
// goes on there: in spring and autumn each tree's canopyColor, keeping the texture's light and dark
// (scaled from GREEN, the summer colour). In summer and winter the texture shows as it is.
const RECOLOUR = spring || autumn
// Winter: whatever faces up on the tiers (not the trunk) turns snow white.
const SNOW_FROM = 0.3 // share of the height below which nothing holds snow (the trunk)
const UP = [0.3, 0.6] as const // a surface this far facing up starts to hold snow, and is white by the second
const SNOW = '0.94, 0.95, 0.97' // linear; '#f4f7fb', as the cones' caps

const f = (x: number) => x.toFixed(3)
const luma = (r: number, g: number, b: number) => 0.3 * r + 0.59 * g + 0.11 * b

function seasons(m: MeshLambertMaterial) {
  const before = m.onBeforeCompile.bind(m)
  m.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer)
    if (winter)
      shader.vertexShader =
        'varying float vSnow;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
  vSnow = smoothstep( ${f(UP[0])}, ${f(UP[1])}, normalize( objectNormal ).y ) * smoothstep( ${f(SNOW_FROM * HEIGHT)}, ${f(SNOW_FROM * HEIGHT + 0.1)}, position.y );`,
        )
    shader.fragmentShader =
      (winter ? 'varying float vSnow;\n' : '') +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `{
    vec3 tex = diffuseColor.rgb;
    ${
      RECOLOUR
        ? `float leaf = smoothstep( 0.0, 0.05, tex.g - tex.r );
    diffuseColor.rgb = mix( tex, vColor.rgb * ( dot( tex, vec3( 0.3, 0.59, 0.11 ) ) / ${f(luma(GREEN.r, GREEN.g, GREEN.b))} ), leaf );`
        : ''
    }
    diffuseColor.rgb *= ${f(BRIGHT)};
    ${winter ? `diffuseColor.rgb = mix( diffuseColor.rgb, vec3( ${SNOW} ), vSnow );` : ''}
  }`,
      )
  }
  m.customProgramCacheKey = () => 'pine'
}

/** The pine geometry from the model, standing on y = 0, centred, HEIGHT tall and WIDTH across. */
function fit(root: Object3D): BufferGeometry {
  root.updateMatrixWorld(true)
  let mesh: Mesh | undefined
  root.traverse((o) => {
    if (!mesh && (o as Mesh).isMesh) mesh = o as Mesh
  })
  const geometry = mesh!.geometry.clone()
  // The pipeline stores positions as 16-bit integers that only reach -1 to 1; stretched to HEIGHT, the
  // top of the tree would wrap round and vanish. Floats first.
  const position = geometry.getAttribute('position')
  const floats = new Float32BufferAttribute(position.count * 3, 3)
  for (let i = 0; i < position.count; i++) floats.setXYZ(i, position.getX(i), position.getY(i), position.getZ(i))
  geometry.setAttribute('position', floats)
  geometry.applyMatrix4(mesh!.matrixWorld)
  const box = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never)
  const s = WIDTH / Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1e-3)
  const sy = HEIGHT / (box.max.y - box.min.y || 1)
  geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2).scale(s, sy, s)
  return geometry
}

export default function PineModel() {
  const gltf = useGLB(URL)
  const { geometry, material } = useMemo(() => {
    let source: MeshStandardMaterial | undefined
    gltf.scene.traverse((o) => {
      if (!source && (o as Mesh).isMesh) source = (o as Mesh).material as MeshStandardMaterial
    })
    const material = new MeshLambertMaterial({ map: source?.map ?? null })
    seasons(material)
    sway(material, SWAY)
    return { geometry: fit(gltf.scene), material }
  }, [gltf])

  const pines = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = pines.current
    if (!mesh) return
    const dummy = new Object3D()
    drawn.forEach((t, n) => {
      dummy.position.set(t.x, 0, t.z)
      dummy.rotation.y = t.turn
      dummy.scale.setScalar(t.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(n, dummy.matrix)
      mesh.setColorAt(n, canopyColor(n))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere() // cover every instance, so the forest isn't culled when the origin is off screen
  }, [geometry])

  return <instancedMesh ref={pines} args={[geometry, material, drawn.length]} />
}
