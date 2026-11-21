import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, DoubleSide, MeshLambertMaterial, Object3D, PlaneGeometry, type InstancedMesh } from 'three'
import { TILE } from './grid'
import { isInland } from './Island'
import { inHouse, roadTiles } from './pois'
import { chime, step } from './sfx'
import { playerPos } from './state'
import { useGame } from './store'
import { trees } from './Trees'
import { visit } from './visits'

// While the visitor was away, a few piles of leaves blew in beside the roads near the house: one
// pile per day away, never more than PILES, so being gone a long time costs nothing. Walking
// through a pile sweeps it up with a rustle; sweeping the last one plays the find chime. Only for
// returning visitors (visits.ts), and only for this visit.

const PILES = 6 // most piles there can be, however long the visitor was away
const MIN_DAYS = 2 // days away before any leaves blow in
const PER_PILE = 6 // leaves in a pile
const NEAR = 9 // piles land within this many tiles of the house
const SWEEP = 0.55 // how close the player must come to sweep a pile up
const FLY = 0.35 // seconds a swept pile takes to whirl away
const COLORS = ['#d9873a', '#c4632f', '#e3b04b', '#a85a2e'].map((c) => new Color(c))

const days = visit.daysAway ?? 0
const count = days >= MIN_DAYS ? Math.min(PILES, days) : 0

// Small seeded PRNG (mulberry32), seeded by the day, so a reload shows the same piles.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Grass tiles beside a road near the house, clear of trees: where the wind leaves things.
function placePiles() {
  if (!count) return []
  const random = rng(Math.floor(Date.now() / 86400000))
  const roads = new Set(roadTiles.map((t) => `${t.i},${t.j}`))
  const treeTiles = new Set(trees.map((t) => `${Math.round(t.x)},${Math.round(t.z)}`))
  const spots: { x: number; z: number }[] = []
  for (const t of roadTiles)
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const i = t.i + di
      const j = t.j + dj
      const k = `${i},${j}`
      if (Math.hypot(i, j) > NEAR || roads.has(k) || treeTiles.has(k) || inHouse(i, j) || !isInland(i, j, 1)) continue
      if (!spots.some((s) => s.x === i && s.z === j)) spots.push({ x: i * TILE, z: j * TILE })
    }
  for (let k = spots.length - 1; k > 0; k--) {
    const r = Math.floor(random() * (k + 1))
    ;[spots[k], spots[r]] = [spots[r], spots[k]]
  }
  return spots.slice(0, count).map((s) => ({
    ...s,
    leaves: Array.from({ length: PER_PILE }, () => ({
      dx: (random() - 0.5) * 0.5,
      dz: (random() - 0.5) * 0.5,
      turn: random() * Math.PI * 2,
      tilt: (random() - 0.5) * 0.5,
      color: COLORS[Math.floor(random() * COLORS.length)],
    })),
  }))
}

const piles = placePiles()
const swept = new Float32Array(piles.length).fill(-1) // seconds since swept; -1 = still there
let left = piles.length
let done = false

const geometry = new PlaneGeometry(0.16, 0.09).rotateX(-Math.PI / 2)
const material = new MeshLambertMaterial({ side: DoubleSide })
const dummy = new Object3D()

export function Leaves() {
  const mesh = useRef<InstancedMesh>(null)
  const ready = useRef(false)

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m || !piles.length) return
    if (!ready.current) {
      piles.forEach((p, n) => p.leaves.forEach((l, k) => m.setColorAt(n * PER_PILE + k, l.color)))
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      ready.current = true
    }
    if (done) return
    const outdoors = useGame.getState().scene === 'world'
    for (let n = 0; n < piles.length; n++) {
      const p = piles[n]
      // Walk through a pile to sweep it up.
      if (swept[n] < 0 && outdoors && (p.x - playerPos.x) ** 2 + (p.z - playerPos.z) ** 2 < SWEEP * SWEEP) {
        swept[n] = 0
        step('grass')
        step('grass')
        if (--left === 0) chime()
      }
      if (swept[n] >= 0 && swept[n] < FLY) swept[n] = Math.min(FLY, swept[n] + Math.min(delta, 0.1))
      const k = swept[n] < 0 ? 0 : swept[n] / FLY // 0 = lying there, 1 = gone
      for (let i = 0; i < PER_PILE; i++) {
        const l = p.leaves[i]
        // Swept leaves whirl up and outward, shrinking to nothing.
        dummy.position.set(p.x + l.dx * (1 + k * 3), 0.02 + k * 0.6, p.z + l.dz * (1 + k * 3))
        dummy.rotation.set(l.tilt, l.turn + k * 6, 0)
        dummy.scale.setScalar(k >= 1 ? 0 : 1 - k * 0.7)
        dummy.updateMatrix()
        m.setMatrixAt(n * PER_PILE + i, dummy.matrix)
      }
    }
    m.instanceMatrix.needsUpdate = true
    // Once every pile has whirled away there's nothing left to move.
    if (left === 0 && swept.every((s) => s >= FLY)) done = true
  })

  if (!piles.length) return null
  return <instancedMesh ref={mesh} args={[geometry, material, piles.length * PER_PILE]} frustumCulled={false} />
}

/** How many piles blew in this visit (for the welcome back). */
export const leafPiles = piles.length
