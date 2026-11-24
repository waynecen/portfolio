import { useEffect, useRef, useState } from 'react'
import { Color, ConeGeometry, CylinderGeometry, MeshLambertMaterial, Object3D, type BufferGeometry, type InstancedMesh } from 'three'
import { addCollider } from '../core/collision'
import { addHittable } from './combat'
import { maybeDrop } from './drops'
import { burst } from '../player/puffs'
import { merge } from '../core/geometry'
import { PEARLS, revealPearl, usePearls } from '../secrets/pearls'
import { winter } from '../world/season'
import { pop } from '../core/sfx'
import { playerPos } from '../core/state'
import { clear } from '../world/tiles'
import { sway } from '../core/wind'
import { useSceneFrame } from '../core/sceneFrame'

// Things to cut and break with the sword (combat.ts): tufts of tall grass scattered over the
// meadows, and a few clay pots. Either can leave a shell or a heart behind (drops.ts), and a few
// tufts hide a pearl (pearls.ts). Cut grass
// grows back a minute later, once the player has walked away; pots stay broken until the next visit.
// In winter the grass is under the snow.

const TUFTS = 90
const SEED = 11
const REGROW = 60 // seconds before a cut tuft grows back
const REGROW_AWAY = 5 // and only while the player is at least this far off
const GRASS_DROP = { heart: 0.06, shell: 0.16 }
const POT_DROP = { heart: 0.25, shell: 0.5 }

// Small seeded PRNG (mulberry32), so the tufts are in the same places on every visit.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Tiles kept clear (tiles.ts): roads, places and their neighbours, the house, and trees.
const key = (i: number, j: number) => `${i},${j}`
const free = (i: number, j: number) => clear(i, j)

type Tuft = { x: number; z: number; turn: number; scale: number; pearl?: string }
function placeTufts(): Tuft[] {
  if (winter) return []
  const random = rng(SEED)
  // First a tuft over each grass pearl, right on top of it, then the rest scattered.
  const hiding = PEARLS.filter((p) => p.hide === 'grass')
  const tiles: { i: number; j: number }[] = []
  for (let i = -30; i <= 30; i++)
    for (let j = -30; j <= 30; j++) if (free(i, j) && !hiding.some((p) => p.x === i && p.z === j)) tiles.push({ i, j })
  for (let k = tiles.length - 1; k > 0; k--) {
    const r = Math.floor(random() * (k + 1))
    ;[tiles[k], tiles[r]] = [tiles[r], tiles[k]]
  }
  const over: Tuft[] = hiding.map((p) => ({ x: p.x, z: p.z, turn: random() * Math.PI * 2, scale: 1.25, pearl: p.id }))
  return over.concat(
    tiles.slice(0, TUFTS - over.length).map((t) => ({
      x: t.i + (random() - 0.5) * 0.5,
      z: t.j + (random() - 0.5) * 0.5,
      turn: random() * Math.PI * 2,
      scale: 0.8 + random() * 0.4,
    })),
  )
}
const tufts = placeTufts()
const cutAt = new Float32Array(tufts.length).fill(-1) // clock time when cut; -1 = standing

// Three blades leaning out from the middle.
function tuftGeometry(): BufferGeometry {
  const blade = (lean: number, turn: number, h: number) =>
    new ConeGeometry(0.06, h, 4).translate(0, h / 2, 0).rotateZ(lean).rotateY(turn)
  return merge([blade(0.25, 0, 0.42), blade(0.3, 2.1, 0.36), blade(0.22, 4.2, 0.4), blade(0.05, 1, 0.3)])
}
const geometry = tuftGeometry()
// Quick in the wind, and parting round the player as they walk through (core/wind.ts).
const material = sway(new MeshLambertMaterial({ color: '#5f9e57', flatShading: true }), { height: 0.42, amount: 0.05, rate: 1.6, part: { radius: 0.9, amount: 0.2 } })
const CLIPPINGS = new Color('#7fbf6a')
const dummy = new Object3D()

export function Grass() {
  const mesh = useRef<InstancedMesh>(null)
  const dirty = useRef(true)

  useEffect(() => {
    const removers = tufts.map((t, n) =>
      addHittable({
        x: t.x,
        z: t.z,
        r: 0.25,
        hit: () => {
          if (cutAt[n] >= 0) return
          cutAt[n] = performance.now() / 1000
          dirty.current = true
          burst(t.x, t.z, 4, CLIPPINGS)
          if (t.pearl && !usePearls.getState().found.includes(t.pearl)) revealPearl(t.pearl)
          else maybeDrop(t.x, t.z, GRASS_DROP.heart, GRASS_DROP.shell)
        },
      }),
    )
    return () => removers.forEach((r) => r())
  }, [])

  useSceneFrame('world', () => {
    const m = mesh.current
    if (!m) return
    // Grow back what was cut a while ago, out of the player's sight-line.
    const now = performance.now() / 1000
    for (let n = 0; n < tufts.length; n++) {
      if (cutAt[n] < 0 || now - cutAt[n] < REGROW) continue
      if ((tufts[n].x - playerPos.x) ** 2 + (tufts[n].z - playerPos.z) ** 2 < REGROW_AWAY * REGROW_AWAY) continue
      cutAt[n] = -1
      dirty.current = true
    }
    if (!dirty.current) return
    dirty.current = false
    for (let n = 0; n < tufts.length; n++) {
      const t = tufts[n]
      dummy.position.set(t.x, 0, t.z)
      dummy.rotation.set(0, t.turn, 0)
      dummy.scale.setScalar(cutAt[n] >= 0 ? 0 : t.scale)
      dummy.updateMatrix()
      m.setMatrixAt(n, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  })

  if (!tufts.length) return null
  return <instancedMesh ref={mesh} args={[geometry, material, tufts.length]} />
}

// Pots: where they'd like to stand, moved to the nearest clear tile. Beside the house and by the dock.
const POT_SPOTS = [
  { i: 4, j: -1 },
  { i: 4, j: 0 },
  { i: -4, j: -1 },
  { i: -7, j: 14 },
  { i: -7, j: 13 },
]
function settle(at: { i: number; j: number }, taken: Set<string>) {
  for (let r = 0; r < 6; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        const i = at.i + di
        const j = at.j + dj
        if (free(i, j) && !taken.has(key(i, j))) {
          taken.add(key(i, j))
          return { x: i, z: j }
        }
      }
  return { x: at.i, z: at.j }
}
const taken = new Set<string>()
const potSpots = POT_SPOTS.map((p) => settle(p, taken))

const potGeometry = merge([
  new CylinderGeometry(0.17, 0.13, 0.34, 10).translate(0, 0.17, 0),
  new CylinderGeometry(0.12, 0.17, 0.08, 10).translate(0, 0.38, 0),
])
const potMaterial = new MeshLambertMaterial({ color: '#c0703f', flatShading: true })
const SHARDS = new Color('#a85a2e')

function Pot({ x, z }: { x: number; z: number }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    if (broken) return
    const removeCollider = addCollider({ kind: 'circle', x, z, r: 0.22 })
    const removeHit = addHittable({
      x,
      z,
      r: 0.2,
      hit: () => {
        setBroken(true)
        pop()
        burst(x, z, 7, SHARDS)
        maybeDrop(x, z, POT_DROP.heart, POT_DROP.shell)
      },
    })
    return () => {
      removeCollider()
      removeHit()
    }
  }, [broken, x, z])
  if (broken) return null
  return <mesh geometry={potGeometry} material={potMaterial} position={[x, 0, z]} />
}

export function Pots() {
  return (
    <>
      {potSpots.map((p, k) => (
        <Pot key={k} x={p.x} z={p.z} />
      ))}
    </>
  )
}
