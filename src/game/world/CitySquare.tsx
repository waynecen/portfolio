import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, CylinderGeometry, MeshLambertMaterial, SphereGeometry, type BufferGeometry, type Mesh } from 'three'
import { addCollider } from '../core/collision'
import { addShells, useShells } from '../drops'
import { block, merge, pick, tint, unindexed } from '../core/geometry'
import { heal } from '../health'
import { register, say, sayFirst } from '../core/interact'
import { waterMaterial } from './Island'
import { FOUNTAIN, SQUARE } from './layout'
import { reducedMotion } from '../core/settings'
import { chime, plop } from '../core/sfx'
import { sky } from './sky'

// The city square east of the house, beside the shop (SQUARE in layout.ts): paving stones, a
// fountain in the middle, benches round it and a lamp post at each corner. The notice board stands
// on its corner nearest the shop (NoticeBoard.tsx). Toss a shell in the fountain to make a wish: it
// fills every heart.

const PAVE_Y = 0.03 // the paving stands this proud of the grass
const GROUT = 0.05 // gap between paving stones
const BASIN_R = 1.15 // the fountain's basin; it's the collider too
const BASIN_H = 0.42
const DROPS = 10 // droplets falling from the top bowl
const DROP_TIME = 0.7 // seconds for one to fall from the bowl to the basin
const LAMP_GLOW = 1.4 // the lamps' glow at night (sky.weather.night)

const STONES = ['#d8cfbd', '#cfc5b0', '#e0d8c8', '#c8bea9'].map((c) => new Color(c))
const GROUT_COLOR = new Color('#a99f8c')
const KERB = new Color('#b7ad98')
const BASIN = new Color('#c9bfa9')
const BASIN_RIM = new Color('#e4ddca')

function buildPaving(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const x0 = SQUARE.i0 - 0.5
  const x1 = SQUARE.i1 + 0.5
  const z0 = SQUARE.j0 - 0.5
  const z1 = SQUARE.j1 + 0.5
  parts.push(tint(unindexed(block(x0, x1, 0, PAVE_Y - 0.005, z0, z1)), GROUT_COLOR))
  // Each tile is four stones, staggered a little in colour.
  for (let i = SQUARE.i0; i <= SQUARE.i1; i++)
    for (let j = SQUARE.j0; j <= SQUARE.j1; j++)
      for (const [a, b] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ]) {
        const sx = i - 0.5 + a * 0.5
        const sz = j - 0.5 + b * 0.5
        parts.push(tint(unindexed(block(sx + GROUT / 2, sx + 0.5 - GROUT / 2, 0, PAVE_Y, sz + GROUT / 2, sz + 0.5 - GROUT / 2)), pick(STONES, i * 2 + a, j * 2 + b)))
      }
  // A low kerb round the edge, open where the road comes in on the west side.
  const K = 0.1
  const H = PAVE_Y + 0.05
  const gap = [FOUNTAIN.z - 0.5, FOUNTAIN.z + 0.5]
  parts.push(tint(unindexed(block(x0, x1, 0, H, z0, z0 + K)), KERB))
  parts.push(tint(unindexed(block(x0, x1, 0, H, z1 - K, z1)), KERB))
  parts.push(tint(unindexed(block(x1 - K, x1, 0, H, z0, z1)), KERB))
  parts.push(tint(unindexed(block(x0, x0 + K, 0, H, z0, gap[0])), KERB))
  parts.push(tint(unindexed(block(x0, x0 + K, 0, H, gap[1], z1)), KERB))
  return merge(parts)
}

function buildFountain(): BufferGeometry {
  const at = (g: BufferGeometry, c: Color) => tint(unindexed(g.translate(FOUNTAIN.x, 0, FOUNTAIN.z)), c)
  return merge([
    at(new CylinderGeometry(BASIN_R, BASIN_R + 0.05, BASIN_H, 8).translate(0, BASIN_H / 2, 0), BASIN),
    at(new CylinderGeometry(BASIN_R + 0.06, BASIN_R + 0.06, 0.06, 8).translate(0, BASIN_H, 0), BASIN_RIM),
    at(new CylinderGeometry(0.16, 0.2, 1.05, 8).translate(0, 0.52, 0), BASIN),
    at(new CylinderGeometry(0.45, 0.22, 0.16, 8).translate(0, 1.08, 0), BASIN_RIM),
    at(new CylinderGeometry(0.07, 0.1, 0.24, 6).translate(0, 1.26, 0), BASIN),
  ])
}

// Benches round the fountain, each facing it: [x, z, turn].
const BENCHES: [number, number, number][] = [
  [FOUNTAIN.x, FOUNTAIN.z - 2.3, 0],
  [FOUNTAIN.x, FOUNTAIN.z + 2.3, Math.PI],
  [FOUNTAIN.x + 2.3, FOUNTAIN.z, -Math.PI / 2],
]
const SEAT = new Color('#a8794f')
const LEGS = new Color('#5a4a3a')
function buildBenches(): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const [x, z, turn] of BENCHES) {
    const bench = [
      tint(unindexed(block(-0.55, 0.55, 0.26, 0.31, -0.16, 0.16)), SEAT),
      tint(unindexed(block(-0.55, 0.55, 0.36, 0.56, -0.2, -0.15)), SEAT),
      ...[-0.45, 0.45].map((lx) => tint(unindexed(block(lx - 0.04, lx + 0.04, 0, 0.26, -0.13, 0.13)), LEGS)),
      ...[-0.45, 0.45].map((lx) => tint(unindexed(block(lx - 0.03, lx + 0.03, 0.26, 0.56, -0.2, -0.15)), LEGS)),
    ]
    // Built facing +z (toward the camera), then turned to face the fountain.
    for (const g of bench) parts.push(g.rotateY(turn).translate(x, PAVE_Y, z))
  }
  return merge(parts)
}

// A lamp post at each corner.
const LAMPS = [
  [SQUARE.i0, SQUARE.j1],
  [SQUARE.i1, SQUARE.j0],
  [SQUARE.i1, SQUARE.j1],
  [SQUARE.i0 + 2, SQUARE.j0], // the north-west corner has the notice board; this one stands beside it
].map(([i, j]) => ({ x: i + (i < FOUNTAIN.x ? -0.3 : 0.3), z: j + (j < FOUNTAIN.z ? -0.3 : 0.3) }))
const POST = new Color('#3f4a52')
function buildPosts(): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const { x, z } of LAMPS) {
    parts.push(tint(unindexed(new CylinderGeometry(0.05, 0.07, 1.5, 6).translate(x, 0.75, z)), POST))
    parts.push(tint(unindexed(new CylinderGeometry(0.15, 0.1, 0.06, 6).translate(x, 1.86, z)), POST))
  }
  return merge(parts)
}

const paving = buildPaving()
const fountain = buildFountain()
const benches = buildBenches()
const posts = buildPosts()
const stone = new MeshLambertMaterial({ vertexColors: true, flatShading: true })
const lanternGeometry = new CylinderGeometry(0.11, 0.09, 0.26, 6)
const lantern = new MeshLambertMaterial({ color: '#fff1c8', emissive: '#ffc96b', emissiveIntensity: 0 })
const basinWater = new CylinderGeometry(BASIN_R - 0.08, BASIN_R - 0.08, 0.02, 8)
const bowlWater = new CylinderGeometry(0.38, 0.38, 0.02, 8)
const dropGeometry = new SphereGeometry(0.035, 5, 4)
const dropMaterial = new MeshLambertMaterial({ color: '#cfeefa', emissive: '#9fd3ea', emissiveIntensity: 0.3 })

const WISHES = [
  'You toss a shell in and make a wish. The water sparkles, and you feel right as rain.',
  'Plip! The shell sinks out of sight. You feel a little lighter.',
  'You wish for something small and nice. Your hearts fill right up.',
  'The shell spins down to the bottom with the others. Somebody’s been making a lot of wishes.',
]
let wishes = 0

function wish() {
  if (useShells.getState().shells < 1) {
    say(['A fountain, gurgling away. People toss shells in for luck.', 'You don’t have a shell to spare.'])
    return
  }
  addShells(-1)
  plop()
  chime()
  heal(99)
  sayFirst(
    'fountain',
    ['You toss a shell in and make a wish.', 'The water sparkles, and every heart fills right up. A shell a wish, any time.'],
    [WISHES[wishes++ % WISHES.length]],
  )
}

export function CitySquare() {
  const drops = useRef<(Mesh | null)[]>([])
  useEffect(() => {
    const removers = [
      addCollider({ kind: 'circle', x: FOUNTAIN.x, z: FOUNTAIN.z, r: BASIN_R + 0.05 }),
      ...BENCHES.map(([x, z, turn]) =>
        addCollider({ kind: 'box', x, z, hx: Math.abs(Math.cos(turn)) * 0.55 + Math.abs(Math.sin(turn)) * 0.2, hz: Math.abs(Math.sin(turn)) * 0.55 + Math.abs(Math.cos(turn)) * 0.2 }),
      ),
      ...LAMPS.map(({ x, z }) => addCollider({ kind: 'circle', x, z, r: 0.1 })),
    ]
    return () => removers.forEach((r) => r())
  }, [])
  useEffect(() => register({ x: FOUNTAIN.x, z: FOUNTAIN.z + BASIN_R, range: 0.9, prompt: 'Make a wish', onInteract: wish }), [])

  useFrame(({ clock }) => {
    lantern.emissiveIntensity = LAMP_GLOW * sky.weather.night
    const t = clock.elapsedTime
    for (let k = 0; k < DROPS; k++) {
      const m = drops.current[k]
      if (!m) continue
      // Out over the top bowl's rim and down into the basin, one after another round the circle.
      const p = reducedMotion() ? 0.5 : (t / DROP_TIME + k / DROPS) % 1
      const a = (k / DROPS) * Math.PI * 2
      const r = 0.4 + p * 0.35
      m.position.set(FOUNTAIN.x + Math.cos(a) * r, 1.12 - p * p * (1.12 - BASIN_H + 0.02), FOUNTAIN.z + Math.sin(a) * r)
    }
  })

  return (
    <>
      <mesh geometry={paving} material={stone} />
      <mesh geometry={fountain} material={stone} />
      <mesh geometry={benches} material={stone} />
      <mesh geometry={posts} material={stone} />
      <mesh geometry={basinWater} material={waterMaterial} position={[FOUNTAIN.x, BASIN_H - 0.04, FOUNTAIN.z]} />
      <mesh geometry={bowlWater} material={waterMaterial} position={[FOUNTAIN.x, 1.15, FOUNTAIN.z]} />
      {LAMPS.map(({ x, z }) => (
        <mesh key={`${x},${z}`} geometry={lanternGeometry} material={lantern} position={[x, 1.7, z]} />
      ))}
      {Array.from({ length: DROPS }, (_, k) => (
        <mesh
          key={k}
          ref={(m) => {
            drops.current[k] = m
          }}
          geometry={dropGeometry}
          material={dropMaterial}
        />
      ))}
    </>
  )
}
