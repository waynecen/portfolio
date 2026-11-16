import { useEffect, useLayoutEffect, useRef } from 'react'
import { ConeGeometry, CylinderGeometry, MeshLambertMaterial, Object3D, type InstancedMesh } from 'three'
import { addCollider } from './collision'
import { TILE, tileAt } from './grid'
import { ISLAND_RADIUS, isInland } from './Island'
import { HOUSE } from './layout'
import { pois, roadTiles } from './pois'

// Placeholder trees: a trunk and a low-poly cone, drawn as two instanced meshes (two draw calls
// for the whole forest). Placed once at load from a fixed seed, so the layout is the same on
// every visit.

const SEED = 7 // change for a different layout
const MAX_TREES = 70
const CLEARANCE = 1 // tiles kept free around every road tile, place and the house
const SHORE_GAP = 1 // tiles kept free between the trees and the beach
const MIN_SCALE = 0.8
const MAX_SCALE = 1.3
const TRUNK_RADIUS = 0.25 // collision radius at scale 1; a little wider than the trunk so the pill doesn't clip the canopy

const key = (i: number, j: number) => `${i},${j}`

// Small seeded PRNG (mulberry32): returns floats in [0, 1).
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Tree = { x: number; z: number; scale: number; turn: number }

function place(): Tree[] {
  const random = rng(SEED)

  // Tiles near roads and places stay clear so paths and doorsteps are never blocked.
  const blocked = new Set<string>()
  const keepClear = (i: number, j: number) => {
    for (let di = -CLEARANCE; di <= CLEARANCE; di++)
      for (let dj = -CLEARANCE; dj <= CLEARANCE; dj++) blocked.add(key(i + di, j + dj))
  }
  for (const t of roadTiles) keepClear(t.i, t.j)
  for (const p of pois) {
    const t = tileAt(p.x, p.z)
    keepClear(t.i, t.j)
  }
  for (let i = HOUSE.i0; i <= HOUSE.i1; i++) for (let j = HOUSE.j0; j <= HOUSE.j1; j++) keepClear(i, j)

  // Every grass tile far enough from the shore, in a seeded shuffled order.
  const n = Math.ceil(ISLAND_RADIUS)
  const candidates: { i: number; j: number }[] = []
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++) if (isInland(i, j, SHORE_GAP) && !blocked.has(key(i, j))) candidates.push({ i, j })
  for (let k = candidates.length - 1; k > 0; k--) {
    const r = Math.floor(random() * (k + 1))
    ;[candidates[k], candidates[r]] = [candidates[r], candidates[k]]
  }

  // Take tiles in that order, skipping any that touch a tree already placed (diagonals too),
  // so there's always a gap to walk between trees.
  const trees: Tree[] = []
  for (const { i, j } of candidates) {
    if (trees.length >= MAX_TREES) break
    if (blocked.has(key(i, j))) continue
    trees.push({ x: i * TILE, z: j * TILE, scale: MIN_SCALE + random() * (MAX_SCALE - MIN_SCALE), turn: random() * Math.PI * 2 })
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) blocked.add(key(i + di, j + dj))
  }
  return trees
}

export const trees = place()

const trunkGeometry = new CylinderGeometry(0.08, 0.12, 0.5, 6).translate(0, 0.25, 0)
const canopyGeometry = new ConeGeometry(0.5, 1.2, 7).translate(0, 1.05, 0)
const trunkMaterial = new MeshLambertMaterial({ color: '#8a5a3b', flatShading: true })
const canopyMaterial = new MeshLambertMaterial({ color: '#3f7d4a', flatShading: true })

export function Trees() {
  const trunks = useRef<InstancedMesh>(null)
  const canopies = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const dummy = new Object3D()
    trees.forEach((t, n) => {
      dummy.position.set(t.x, 0, t.z)
      dummy.rotation.y = t.turn
      dummy.scale.setScalar(t.scale)
      dummy.updateMatrix()
      trunks.current?.setMatrixAt(n, dummy.matrix)
      canopies.current?.setMatrixAt(n, dummy.matrix)
    })
    for (const mesh of [trunks.current, canopies.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere() // cover every instance, so the forest isn't culled when the origin is off screen
    }
  }, [])

  useEffect(() => {
    const removers = trees.map((t) => addCollider({ kind: 'circle', x: t.x, z: t.z, r: TRUNK_RADIUS * t.scale }))
    return () => removers.forEach((remove) => remove())
  }, [])

  return (
    <>
      <instancedMesh ref={trunks} args={[trunkGeometry, trunkMaterial, trees.length]} />
      <instancedMesh ref={canopies} args={[canopyGeometry, canopyMaterial, trees.length]} />
    </>
  )
}
