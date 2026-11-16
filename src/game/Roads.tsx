import { MeshLambertMaterial, type BufferGeometry } from 'three'
import { flat, merge } from './geometry'
import { TILE } from './grid'
import { roadTiles } from './pois'

const LIFT = 0.01 // just above the ground; polygonOffset handles the rest of the z-fighting

// One square per road or plaza tile, merged into one geometry: one draw call for all paths.
// Tiles are full-size, so neighbours join into solid straight paths with square corners.
function build(): BufferGeometry {
  const h = TILE / 2
  return merge(roadTiles.map(({ i, j }) => flat(i * TILE - h, i * TILE + h, j * TILE - h, j * TILE + h, LIFT)))
}

const geometry = build()
const material = new MeshLambertMaterial({ color: '#d8c08a', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })

export function Roads() {
  return <mesh geometry={geometry} material={material} />
}
