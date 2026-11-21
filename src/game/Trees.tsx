import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { ConeGeometry, CylinderGeometry, MeshLambertMaterial, Object3D, Vector2, type InstancedMesh } from 'three'
import { addCollider } from './collision'
import { TILE, tileAt } from './grid'
import { FOREST, ISLAND_RADIUS, isInland } from './Island'
import { HOUSE } from './layout'
import { pois, roadTiles } from './pois'
import { winter } from './season'
import { playerPos } from './state'

// Placeholder trees: a trunk and a low-poly cone, drawn as instanced meshes (a draw call or two
// for every tree on the island). Placed once at load from a fixed seed, so the layout is the same
// on every visit. Scattered over the main island, and packed close in the forest on the
// north-west land (FOREST in Island.tsx), round a clearing in its middle that a road leads to.
// A tree between the camera and the player thins out, so the player never disappears behind one.

const SEED = 7 // change for a different layout
const MAX_TREES = 70 // on the main island; the forest has its own
const CLEARANCE = 1 // tiles kept free around every road tile, place and the house
const SHORE_GAP = 1 // tiles kept free between the trees and the beach
const MIN_SCALE = 0.8
const MAX_SCALE = 1.3
const TRUNK_RADIUS = 0.25 // collision radius at scale 1; a little wider than the trunk so the pill doesn't clip the canopy
const MAX_TRUNK = 0.3 // and at most this, so the pill (0.35 radius) still fits between forest trees corner to corner
const FOREST_DENSITY = 0.85 // share of the forest's tree spots (every other tile, like a chessboard's dark squares) that get one
const FOREST_SCALE = [1, 1.5] // forest trees grow taller than the island's
const CLEARING = 3.5 // radius of the open clearing in the middle of the forest, in tiles
const FADE = 0.75 // how much of a tree in front of the player drops out (0 = none, 1 = all of it)

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

function shuffle<T>(list: T[], random: () => number) {
  for (let k = list.length - 1; k > 0; k--) {
    const r = Math.floor(random() * (k + 1))
    ;[list[k], list[r]] = [list[r], list[k]]
  }
  return list
}

export type Tree = { x: number; z: number; scale: number; turn: number }

/** True if tile (i, j) is on the forest's land. */
export const inForest = (i: number, j: number) => Math.hypot(i - FOREST.x, j - FOREST.z) < FOREST.r

function place(): Tree[] {
  const random = rng(SEED)
  const trees: Tree[] = []

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

  // The forest: trees on every other tile, like a chessboard's dark squares, with a few missing.
  // They're never side by side, only corner to corner, so there's always a way through on the
  // diagonals. Its trees keep the island's scattered ones a tile away.
  const near = new Set<string>()
  const fi = Math.round(FOREST.x)
  const fj = Math.round(FOREST.z)
  const fr = Math.ceil(FOREST.r)
  const forestTiles: { i: number; j: number }[] = []
  for (let i = fi - fr; i <= fi + fr; i++)
    for (let j = fj - fr; j <= fj + fr; j++)
      if ((i + j) % 2 === 0 && inForest(i, j) && isInland(i, j, SHORE_GAP) && Math.hypot(i - FOREST.x, j - FOREST.z) >= CLEARING)
        forestTiles.push({ i, j })
  const forestRandom = rng(SEED + 1)
  for (const { i, j } of shuffle(forestTiles, forestRandom)) {
    if (blocked.has(key(i, j)) || forestRandom() > FOREST_DENSITY) continue
    const scale = FOREST_SCALE[0] + forestRandom() * (FOREST_SCALE[1] - FOREST_SCALE[0])
    trees.push({ x: i * TILE, z: j * TILE, scale, turn: forestRandom() * Math.PI * 2 })
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) near.add(key(i + di, j + dj))
  }

  // The main island: every grass tile far enough from the shore and outside the forest, in a
  // seeded shuffled order. The shuffle ignores roads and places, so moving one only changes the
  // trees near it, not the whole forest.
  const n = Math.ceil(ISLAND_RADIUS)
  const candidates: { i: number; j: number }[] = []
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++) if (isInland(i, j, SHORE_GAP) && !inForest(i, j)) candidates.push({ i, j })
  shuffle(candidates, random)

  // Take tiles in that order, skipping any that touch a tree already placed (diagonals too),
  // so there's always a gap to walk between trees.
  let placed = 0
  for (const { i, j } of candidates) {
    if (placed >= MAX_TREES) break
    if (blocked.has(key(i, j)) || near.has(key(i, j))) continue
    trees.push({ x: i * TILE, z: j * TILE, scale: MIN_SCALE + random() * (MAX_SCALE - MIN_SCALE), turn: random() * Math.PI * 2 })
    placed++
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) blocked.add(key(i + di, j + dj))
  }
  return trees
}

export const trees = place()

// See-through: each tree works out in its vertex shader how far it stands in front of the player
// (toward the camera, and to the side), and its pixels drop out in a fine, fixed noise pattern in
// proportion. Cheaper than sorting transparent trees, and nothing is allocated per frame.
const player = { value: new Vector2() }
function seeThrough(m: MeshLambertMaterial) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uPlayer = player
    shader.vertexShader =
      'uniform vec2 uPlayer;\nvarying float vFade;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
  vec2 toTree = instanceMatrix[3].xz - uPlayer;
  vFade = ${FADE.toFixed(3)} * (1.0 - smoothstep(0.7, 1.4, abs(toTree.x))) * smoothstep(-0.2, 0.4, toTree.y) * (1.0 - smoothstep(2.4, 3.4, toTree.y));`,
      )
    shader.fragmentShader =
      'varying float vFade;\n' +
      shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
  if (vFade > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;`,
      )
  }
  return m
}

const trunkGeometry = new CylinderGeometry(0.08, 0.12, 0.5, 6).translate(0, 0.25, 0)
const canopyGeometry = new ConeGeometry(0.5, 1.2, 7).translate(0, 1.05, 0)
const trunkMaterial = seeThrough(new MeshLambertMaterial({ color: '#8a5a3b', flatShading: true }))
const canopyMaterial = seeThrough(new MeshLambertMaterial({ color: '#3f7d4a', flatShading: true }))
// Winter: a white cone over the canopy's top half, a little wider so no green shows through its rim.
const capGeometry = new ConeGeometry(0.25, 0.56, 7).translate(0, 1.37, 0)
const capMaterial = seeThrough(new MeshLambertMaterial({ color: '#f4f7fb', flatShading: true }))

export function Trees() {
  const trunks = useRef<InstancedMesh>(null)
  const canopies = useRef<InstancedMesh>(null)
  const caps = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const dummy = new Object3D()
    trees.forEach((t, n) => {
      dummy.position.set(t.x, 0, t.z)
      dummy.rotation.y = t.turn
      dummy.scale.setScalar(t.scale)
      dummy.updateMatrix()
      trunks.current?.setMatrixAt(n, dummy.matrix)
      canopies.current?.setMatrixAt(n, dummy.matrix)
      caps.current?.setMatrixAt(n, dummy.matrix)
    })
    for (const mesh of [trunks.current, canopies.current, caps.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere() // cover every instance, so the forest isn't culled when the origin is off screen
    }
  }, [])

  useEffect(() => {
    const removers = trees.map((t) => addCollider({ kind: 'circle', x: t.x, z: t.z, r: Math.min(MAX_TRUNK, TRUNK_RADIUS * t.scale) }))
    return () => removers.forEach((remove) => remove())
  }, [])

  useFrame(() => {
    player.value.set(playerPos.x, playerPos.z)
  })

  return (
    <>
      <instancedMesh ref={trunks} args={[trunkGeometry, trunkMaterial, trees.length]} />
      <instancedMesh ref={canopies} args={[canopyGeometry, canopyMaterial, trees.length]} />
      {winter && <instancedMesh ref={caps} args={[capGeometry, capMaterial, trees.length]} />}
    </>
  )
}
