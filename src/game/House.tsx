import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { CanvasTexture, Color, ExtrudeGeometry, MeshLambertMaterial, RepeatWrapping, Shape, SRGBColorSpace, type BufferGeometry } from 'three'
import { addCollider, type Collider } from './core/collision'
import { block, flat, merge, pick, tint, unindexed } from './core/geometry'
import { DOOR, FRONT_DOOR, HOUSE, INTERIOR, ROOM } from './world/layout'
import { winter } from './world/season'
import { sky } from './world/sky'

// The house the game starts in: one room seen from above, with nothing around it (the background
// is black indoors), and the same house seen from outside at the centre of the island. Built from
// placeholder blocks, merged into a few meshes. Interior positions are house-local; the room sits
// at INTERIOR in the world.

const WALL = 0.5 // wall thickness
const WALL_H = 1.6 // back and side walls
const FRONT_H = 0.35 // the front wall stays low so it never hides the room
const CAP = 0.08 // the wooden cap along the top of every wall
const SEAM = 0.02 // dark gap left between tatami mats
const HERI = 0.045 // width of the cloth border along a mat's long sides
const WEAVE = 9 // rush stripes across each tile of a mat

const MAT = ['#c9c288', '#bfb87b', '#cfc792'].map((c) => new Color(c)) // tatami pick one of these, fresh to sun-faded
const C = {
  seams: new Color('#4a4630'),
  heri: new Color('#2f3a33'),
  plaster: new Color('#e3d3b0'),
  frontWall: new Color('#8a6040'),
  cap: new Color('#6e4a30'),
}

const H = ROOM.hx // inner half-width
const D = ROOM.hz // inner half-depth

// Solid things in house-local coordinates. Boxes are centre plus half-sizes.
const SOLIDS: Collider[] = [
  { kind: 'box', x: 0, z: -D - WALL / 2, hx: H + WALL, hz: WALL / 2 }, // back wall
  { kind: 'box', x: -H - WALL / 2, z: WALL / 2, hx: WALL / 2, hz: D + WALL / 2 }, // left wall
  { kind: 'box', x: H + WALL / 2, z: WALL / 2, hx: WALL / 2, hz: D + WALL / 2 }, // right wall
  { kind: 'box', x: -(H + DOOR) / 2, z: D + WALL / 2, hx: (H - DOOR) / 2, hz: WALL / 2 }, // front wall, left of the door
  { kind: 'box', x: (H + DOOR) / 2, z: D + WALL / 2, hx: (H - DOOR) / 2, hz: WALL / 2 }, // front wall, right of the door
  { kind: 'box', x: 0, z: D + WALL + 0.5, hx: DOOR, hz: 0.25 }, // backstop past the doorstep
]

// Floor: tatami, each mat one tile deep and two long (so they line up with the edit grid), laid
// in rows shifted by a tile so four corners never meet, with half mats filling the row ends.
// The mats' faces carry the rush weave texture; their cloth borders and the dark base showing
// through the seams are a second, plain mesh.
function buildFloor(): { mats: BufferGeometry; trim: BufferGeometry } {
  const mats: BufferGeometry[] = []
  const trim: BufferGeometry[] = []
  const rows = Math.round(2 * D)
  const cols = Math.round(2 * H)
  for (let r = 0; r < rows; r++) {
    const z0 = -D + r + SEAM / 2
    const z1 = -D + r + 1 - SEAM / 2
    for (let c = -(r % 2), n = 0; c < cols; c += 2, n++) {
      const x0 = -H + Math.max(0, c) + SEAM / 2
      const x1 = -H + Math.min(cols, c + 2) - SEAM / 2
      const face = flat(x0, x1, z0 + HERI, z1 - HERI, 0)
      const uv = face.getAttribute('uv')
      for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * (x1 - x0)) // one weave repeat per tile
      mats.push(tint(face, pick(MAT, r, n)))
      trim.push(tint(flat(x0, x1, z0, z0 + HERI, 0.002), C.heri), tint(flat(x0, x1, z1 - HERI, z1, 0.002), C.heri))
    }
  }
  trim.push(tint(flat(-H, H, -D, D + WALL, -0.005), C.seams)) // base, running out under the doorstep
  return { mats: merge(mats), trim: merge(trim) }
}

// The rush weave: fine stripes across the mat, drawn once. Light enough that the mats' vertex
// colours, which it multiplies, still set their shade.
function weave() {
  const canvas = document.createElement('canvas')
  canvas.width = WEAVE * 4
  canvas.height = 1
  const g = canvas.getContext('2d')!
  for (let x = 0; x < canvas.width; x++) {
    const v = [255, 240, 212, 232][x % 4]
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(x, 0, 1, 1)
  }
  const t = new CanvasTexture(canvas)
  t.wrapS = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

// Walls: every piece a box painted per vertex, merged into one mesh.
function buildWalls(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const box = (c: Color, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    parts.push(tint(block(x0, x1, y0, y1, z0, z1), c))

  // Walls, each with a wooden cap. The side walls run to the front, framing the low front wall.
  const back = [-H - WALL, H + WALL, -D - WALL, -D] as const
  box(C.plaster, back[0], back[1], 0, WALL_H, back[2], back[3])
  box(C.cap, back[0] - 0.04, back[1] + 0.04, WALL_H, WALL_H + CAP, back[2] - 0.04, back[3] + 0.04)
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -H - WALL : H
    box(C.plaster, x0, x0 + WALL, 0, WALL_H, -D, D + WALL)
    box(C.cap, x0 - 0.04, x0 + WALL + 0.04, WALL_H, WALL_H + CAP, -D, D + WALL + 0.04)
    // Front wall, either side of the door, with a post framing the doorway.
    const [f0, f1] = s < 0 ? [-H, -DOOR] : [DOOR, H]
    box(C.frontWall, f0, f1, 0, FRONT_H, D, D + WALL)
    box(C.cap, f0, f1, FRONT_H, FRONT_H + CAP, D - 0.04, D + WALL + 0.04)
    box(C.cap, s * DOOR - 0.1, s * DOOR + 0.1, 0, FRONT_H + 0.3, D - 0.05, D + WALL + 0.05)
  }
  box(C.cap, -DOOR, DOOR, -0.02, 0.005, D, D + WALL) // doorstep

  return merge(parts)
}

const floor = buildFloor()
const matMaterial = new MeshLambertMaterial({ vertexColors: true, map: weave() })
const walls = buildWalls()

/** The room the game starts in, without its furniture (Furniture.tsx). Drawn only while the player is indoors; see Game.tsx. */
export function HouseInterior() {
  useEffect(() => {
    const removers = SOLIDS.map((c) => addCollider({ ...c, x: c.x + INTERIOR.x, z: c.z + INTERIOR.z }))
    return () => removers.forEach((remove) => remove())
  }, [])

  return (
    <group position={[INTERIOR.x, 0, INTERIOR.z]}>
      <mesh geometry={floor.mats} material={matMaterial} />
      <mesh geometry={floor.trim}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={walls}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
    </group>
  )
}

// Outside: plaster walls on a stone footing, a pitched red roof running left to right, and a door
// and two windows on the front. The walls fill the footprint in layout.ts exactly.
const OUT_WALL_H = 1.4
const RISE = 1 // height of the roof's ridge above the walls
const EAVES = 0.25 // how far the roof overhangs the walls

const O = {
  plaster: new Color('#efe3c6'),
  footing: new Color('#b9ae98'),
  roof: new Color(winter ? '#f2f5f9' : '#c0573f'), // snowed over in winter
  ridge: new Color('#9e4532'),
  door: new Color('#7a4f30'),
  frame: new Color('#5c3b24'),
}

const X0 = HOUSE.i0 - 0.5
const X1 = HOUSE.i1 + 0.5
const Z0 = HOUSE.j0 - 0.5
const Z1 = HOUSE.j1 + 0.5

function buildExterior(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const box = (c: Color, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    parts.push(tint(unindexed(block(x0, x1, y0, y1, z0, z1)), c))

  box(O.plaster, X0, X1, 0, OUT_WALL_H, Z0, Z1)
  box(O.footing, X0 - 0.04, X1 + 0.04, 0, 0.25, Z0 - 0.04, Z1 + 0.04)

  // Gable: a triangle on top of the walls, extruded the house's full width.
  const depth = Z1 - Z0
  const tri = new Shape()
  tri.moveTo(-depth / 2, 0)
  tri.lineTo(depth / 2, 0)
  tri.lineTo(0, RISE)
  tri.closePath()
  const gable = new ExtrudeGeometry(tri, { depth: X1 - X0, bevelEnabled: false })
    .rotateY(-Math.PI / 2) // shape's x runs along the house's depth; extrusion runs along its width
    .translate(X1, OUT_WALL_H, (Z0 + Z1) / 2)
  parts.push(tint(gable, O.plaster))

  // Roof: two slabs meeting at the ridge, overhanging the walls on every side.
  const half = depth / 2 + EAVES
  const slope = Math.atan2(RISE, depth / 2)
  const length = half / Math.cos(slope)
  for (const s of [-1, 1]) {
    const slab = block(X0 - EAVES, X1 + EAVES, -0.06, 0.06, -length / 2, length / 2)
      .rotateX(s * slope)
      .translate(0, OUT_WALL_H + RISE - (half / 2) * Math.tan(slope) + 0.06, (Z0 + Z1) / 2 + (s * half) / 2)
    parts.push(tint(unindexed(slab), O.roof))
  }
  box(O.ridge, X0 - EAVES, X1 + EAVES, OUT_WALL_H + RISE, OUT_WALL_H + RISE + 0.1, (Z0 + Z1) / 2 - 0.08, (Z0 + Z1) / 2 + 0.08)

  // Front: the door in the middle, a window either side.
  const fx = FRONT_DOOR.x
  box(O.frame, fx - DOOR + 0.02, fx + DOOR - 0.02, 0, 1.05, Z1, Z1 + 0.05)
  box(O.door, fx - DOOR + 0.1, fx + DOOR - 0.1, 0, 0.97, Z1 + 0.05, Z1 + 0.07)
  for (const x of [fx - 1.5, fx + 1.5]) {
    box(O.frame, x - 0.32, x + 0.32, 0.5, 1.1, Z1, Z1 + 0.04)
  }
  return merge(parts)
}

const exterior = buildExterior()

// The window panes are their own mesh so they can light up from inside at night.
const GLOW = 1.1 // how bright the windows glow at full night
const panes = merge([FRONT_DOOR.x - 1.5, FRONT_DOOR.x + 1.5].map((x) => block(x - 0.24, x + 0.24, 0.58, 1.02, Z1 + 0.04, Z1 + 0.05)))
const paneMaterial = new MeshLambertMaterial({ color: '#8fb8d8', emissive: '#ffc766', emissiveIntensity: 0 })

/** The house from outside, at the centre of the island. Its door leads in (see Doors.tsx). */
export function HouseExterior() {
  useEffect(
    () => addCollider({ kind: 'box', x: (X0 + X1) / 2, z: (Z0 + Z1) / 2, hx: (X1 - X0) / 2, hz: (Z1 - Z0) / 2 }),
    [],
  )
  useFrame(() => {
    paneMaterial.emissiveIntensity = GLOW * sky.weather.night
  })
  return (
    <>
      <mesh geometry={exterior}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <mesh geometry={panes} material={paneMaterial} />
    </>
  )
}
