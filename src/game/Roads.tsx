import { CircleGeometry, MeshLambertMaterial, PlaneGeometry, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HUB, PLAZA_RADIUS, roads } from './pois'

const WIDTH = 1.3 // road width, world units
const LIFT = 0.01 // just above the ground; polygonOffset handles the rest of the z-fighting

// Every road segment, round joint and the plaza merged into one geometry: one draw call for all paths.
function build(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const flat = (g: BufferGeometry) => g.rotateX(-Math.PI / 2)
  const plaza = flat(new CircleGeometry(PLAZA_RADIUS, 32))
  parts.push(plaza.translate(HUB.x, LIFT, HUB.z))
  for (const road of roads) {
    for (let i = 0; i < road.length; i++) {
      const p = road[i]
      // Round joint at every point, so the bends and ends look smooth.
      parts.push(flat(new CircleGeometry(WIDTH / 2, 12)).translate(p.x, LIFT, p.z))
      if (i === 0) continue
      const q = road[i - 1]
      const dx = p.x - q.x
      const dz = p.z - q.z
      const seg = flat(new PlaneGeometry(Math.hypot(dx, dz), WIDTH))
      seg.rotateY(Math.atan2(-dz, dx))
      parts.push(seg.translate((p.x + q.x) / 2, LIFT, (p.z + q.z) / 2))
    }
  }
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  return merged
}

const geometry = build()
const material = new MeshLambertMaterial({ color: '#d8c08a', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })

export function Roads() {
  return <mesh geometry={geometry} material={material} />
}
