import { MeshLambertMaterial, PlaneGeometry, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TILE } from './grid'
import { roadTiles } from './pois'

const LIFT = 0.01 // just above the ground; polygonOffset handles the rest of the z-fighting

// One square per road or plaza tile, merged into one geometry: one draw call for all paths.
// Tiles are full-size, so neighbours join into solid straight paths with square corners.
function build(): BufferGeometry {
  const parts = roadTiles.map(({ i, j }) =>
    new PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2).translate(i * TILE, LIFT, j * TILE),
  )
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  return merged
}

const geometry = build()
const material = new MeshLambertMaterial({ color: '#d8c08a', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })

export function Roads() {
  return <mesh geometry={geometry} material={material} />
}
