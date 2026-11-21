import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { Color, CylinderGeometry, MeshLambertMaterial, type BufferGeometry, type Group } from 'three'
import { addCollider, type Collider } from './collision'
import { useEdit } from './edit'
import { centreOf, PIECE, placed, useOwned, useRoom, type PieceId } from './room'
import { block, merge, tint } from './geometry'
import { register, say, type Interactable } from './interact'
import { keyName, keysName, type Action } from './keymap'
import { INTERIOR } from './layout'
import { isTouch } from './quality'
import { useGame } from './store'
import { reducedMotion } from './settings'

// The room's furniture, one mesh per piece so each can be moved on its own (see room.ts and
// edit.ts). Every piece is built from placeholder blocks around its footprint's centre, and
// brings its colliders, and anything you can use on it, along when it moves.

const LIFT = 0.25 // how high a piece floats while it's being moved
const BOB = 0.04 // and how much it bobs

const C = {
  wood: new Color('#8a5a3b'),
  cap: new Color('#6e4a30'),
  sheet: new Color('#f4efe4'),
  blanket: new Color('#6f9bd1'),
  pot: new Color('#b5653f'),
  potLip: new Color('#9a5434'),
  jar: new Color('#d9a441'),
  rugEdge: new Color('#b85c45'),
  rugField: new Color('#e2b56c'),
  paper: new Color('#fffaf0'),
  brass: new Color('#d9a441'),
}

/** Lines in the note on the table: the first thing to read, so it covers the controls (named as they're bound now, keymap.ts). */
const note = () => isTouch
  ? [
      'Welcome home! This little world is my portfolio.',
      'Drag the joystick on the left to walk. Hold B to sprint, or tap it to swing your sword.',
      'Tap A to read, talk or use whatever is nearby. With nothing nearby, A makes you roll.',
      'The record player by the back wall plays music. Tap A beside it to choose a song.',
      'To move the furniture around, open the menu at the bottom and tap Edit room.',
      'Little things are hidden around the island. Tap the menu button at the bottom, then Bag, to see what you’ve found.',
      'The door at the bottom of the room leads outside.',
      'Each pillar out there is a project. Walk up to one to see it, then tap A to open it.',
    ]
  : [
      'Welcome home! This little world is my portfolio.',
      `Walk with ${['forward', 'left', 'back', 'right'].map((a) => keyName(a as Action)).join('')} or the arrow keys. Hold ${keyName('sprint')} to sprint, and press ${keyName('roll')} to roll.`,
      `Click, or press ${keysName('attack')}, to swing your sword. Hold it after a swing, then let go, to spin.`,
      `Press ${keysName('interact')} to read, talk or use whatever is nearby.`,
      `The record player by the back wall plays music. Press ${keyName('interact')} beside it to choose a song.`,
      `Press ${keyName('edit')} to move the furniture around, and ${keyName('photo')} to take a photo.`,
      `Little things are hidden around the island. Press ${keyName('bag')} to see what you’ve found.`,
      'The door at the bottom of the room leads outside.',
      `Each pillar out there is a project. Walk up to one to see it, then press ${keyName('interact')} to open it.`,
      `Every key can be changed in the settings (${keyName('settings')}).`,
    ]
const NOTE_AT = { x: -0.1, z: 0 } // on the table, from its centre

function cylinder(x: number, z: number, r0: number, r1: number, y0: number, y1: number, color: Color) {
  return tint(new CylinderGeometry(r1, r0, y1 - y0, 10).translate(x, (y0 + y1) / 2, z), color)
}

// Each piece's look, centred on its footprint, and what you bump into. Pieces with the same
// builder (the stools, the pots) share one geometry.
type Build = { parts: (box: Box, add: (g: BufferGeometry) => void) => void; solid: Collider[] }
type Box = (c: Color, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => void

const BED: Build = {
  // Frame, headboard, mattress, blanket and pillow. The headboard is at the back (-z).
  parts: (box) => {
    box(C.wood, -0.45, 0.45, 0, 0.3, -0.95, 0.9)
    box(C.wood, -0.45, 0.45, 0, 0.75, -0.95, -0.8)
    box(C.sheet, -0.4, 0.4, 0.3, 0.42, -0.8, 0.85)
    box(C.blanket, -0.42, 0.42, 0.3, 0.46, -0.1, 0.88)
    box(C.sheet, -0.3, 0.3, 0.42, 0.53, -0.75, -0.45)
  },
  solid: [{ kind: 'box', x: 0, z: -0.03, hx: 0.45, hz: 0.93 }],
}
const DRESSER: Build = {
  // Against the back of its tiles, with jars on top.
  parts: (box, add) => {
    box(C.wood, -1.2, 1.2, 0, 1.0, -0.5, -0.15)
    box(C.cap, -1.25, 1.25, 1.0, 1.06, -0.52, -0.12)
    for (const x of [-0.7, 0, 0.7]) add(cylinder(x, -0.33, 0.12, 0.1, 1.06, 1.3, C.jar))
  },
  solid: [{ kind: 'box', x: 0, z: -0.33, hx: 1.2, hz: 0.18 }],
}
const TABLE: Build = {
  // Top, four legs and the note.
  parts: (box) => {
    box(C.wood, -0.95, 0.95, 0.5, 0.6, -0.45, 0.45)
    for (const x of [-0.85, 0.77]) for (const z of [-0.35, 0.27]) box(C.wood, x, x + 0.08, 0, 0.5, z, z + 0.08)
    box(C.paper, NOTE_AT.x - 0.15, NOTE_AT.x + 0.15, 0.6, 0.615, NOTE_AT.z - 0.12, NOTE_AT.z + 0.12)
  },
  solid: [{ kind: 'box', x: 0, z: 0, hx: 0.95, hz: 0.45 }],
}
const STOOL: Build = {
  parts: (_, add) => add(cylinder(0, 0, 0.22, 0.22, 0, 0.35, C.wood)),
  solid: [{ kind: 'circle', x: 0, z: 0, r: 0.22 }],
}
const POT: Build = {
  parts: (_, add) => {
    add(cylinder(0, 0, 0.3, 0.22, 0, 0.45, C.pot))
    add(cylinder(0, 0, 0.2, 0.2, 0.45, 0.52, C.potLip))
  },
  solid: [{ kind: 'circle', x: 0, z: 0, r: 0.3 }],
}
const CHEST: Build = {
  // Towards the back of its tile, with a brass band.
  parts: (box) => {
    box(C.wood, -0.4, 0.4, 0, 0.45, -0.45, 0.15)
    box(C.brass, -0.42, 0.42, 0.3, 0.36, -0.47, 0.17)
  },
  solid: [{ kind: 'box', x: 0, z: -0.15, hx: 0.4, hz: 0.3 }],
}
const RUG: Build = {
  // A border with a lighter field, just inside its tiles so two rugs side by side still read as two.
  parts: (box) => {
    box(C.rugEdge, -1.45, 1.45, 0, 0.012, -0.95, 0.95)
    box(C.rugField, -1.2, 1.2, 0, 0.018, -0.7, 0.7)
  },
  solid: [],
}

// Bought at the shop (shop.ts): only in the room once owned.
const LAMP: Build = {
  // A paper lantern on a thin stand.
  parts: (box, add) => {
    add(cylinder(0, 0, 0.18, 0.18, 0, 0.04, new Color('#6b4a2e')))
    box(new Color('#6b4a2e'), -0.025, 0.025, 0.04, 0.9, -0.025, 0.025)
    add(cylinder(0, 0, 0.2, 0.24, 0.9, 1.3, new Color('#f4e3c0')))
  },
  solid: [{ kind: 'circle', x: 0, z: 0, r: 0.2 }],
}
const PLANT: Build = {
  // A fern in a pot: a fan of leaves over a little clay pot.
  parts: (box, add) => {
    add(cylinder(0, 0, 0.22, 0.16, 0, 0.3, new Color('#c0703f')))
    const leaf = new Color('#4f8f4f')
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      const x = Math.cos(a) * 0.16
      const z = Math.sin(a) * 0.16
      box(leaf, x - 0.06, x + 0.06, 0.3, 0.62 + (k % 2) * 0.1, z - 0.06, z + 0.06)
    }
  },
  solid: [{ kind: 'circle', x: 0, z: 0, r: 0.22 }],
}
const SHELF: Build = {
  // A tall bookshelf against the back of its tile, three shelves of coloured spines.
  parts: (box) => {
    box(C.wood, -0.45, 0.45, 0, 1.5, -0.45, -0.15)
    const spines = ['#c45a4a', '#4a7fb5', '#d9b24a', '#5f9e57', '#8a5ab5'].map((c) => new Color(c))
    for (let shelf = 0; shelf < 3; shelf++) {
      const y = 0.08 + shelf * 0.48
      box(C.cap, -0.42, 0.42, y + 0.36, y + 0.4, -0.45, -0.12)
      for (let k = 0; k < 6; k++) {
        const x = -0.38 + k * 0.13
        box(spines[(k + shelf * 2) % spines.length], x, x + 0.1, y, y + 0.3 - (k % 3) * 0.04, -0.42, -0.16)
      }
    }
  },
  solid: [{ kind: 'box', x: 0, z: -0.3, hx: 0.45, hz: 0.15 }],
}

const BUILDS: Partial<Record<PieceId, Build>> = {
  bed: BED, dresser: DRESSER, table: TABLE, stool1: STOOL, stool2: STOOL,
  pot1: POT, pot2: POT, pot3: POT, chest: CHEST, rug: RUG,
  lamp: LAMP, plant: PLANT, shelf: SHELF,
} // the record player draws itself (RecordPlayer.tsx)

const geometries = new Map<Build, BufferGeometry>()
function geometryOf(b: Build) {
  let g = geometries.get(b)
  if (!g) {
    const parts: BufferGeometry[] = []
    b.parts((c, x0, x1, y0, y1, z0, z1) => parts.push(tint(block(x0, x1, y0, y1, z0, z1), c)), (p) => parts.push(p))
    geometries.set(b, (g = merge(parts)))
  }
  return g
}
const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true })

/** Things to use on a piece, from its centre. */
const USES: Partial<Record<PieceId, Omit<Interactable, 'x' | 'z'> & { dx: number; dz: number }>> = {
  table: { dx: NOTE_AT.x, dz: NOTE_AT.z, range: 1.4, prompt: 'Read', onInteract: () => say(note()) },
}

/**
 * Keeps piece `id`'s group where the piece is (or floating in hand while it's being moved), and
 * moves `solid` colliders and the `use` interactable (both relative to its centre) along with it.
 */
export function usePiece(id: PieceId, group: RefObject<Group | null>, solid: Collider[], use?: Omit<Interactable, 'x' | 'z'> & { dx: number; dz: number }) {
  useEffect(() => {
    const p = PIECE[id]
    const world = solid.map((c) => ({ ...c }))
    const item: Interactable | null = use ? { ...use, x: 0, z: 0 } : null
    const follow = () => {
      const at = centreOf(p, useRoom.getState().spots[id])
      world.forEach((c, k) => {
        c.x = at.x + solid[k].x
        c.z = at.z + solid[k].z
      })
      if (item && use) {
        item.x = at.x + use.dx
        item.z = at.z + use.dz
      }
    }
    follow()
    const removers = world.map(addCollider)
    if (item) removers.push(register(item))
    removers.push(useRoom.subscribe(follow))
    return () => removers.forEach((remove) => remove())
  }, [id, solid, use])

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const h = useEdit.getState().held
    const held = h !== null && h.id === id && useGame.getState().editing
    const at = held ? h.at : useRoom.getState().spots[id]
    const p = PIECE[id]
    g.position.x = INTERIOR.x + at.i + (p.w - 1) / 2 // centreOf(), without making an object each frame
    g.position.z = INTERIOR.z + at.j + (p.d - 1) / 2
    g.position.y = held ? LIFT + (reducedMotion() ? 0 : Math.sin(clock.elapsedTime * 5) * BOB) : 0
  })
}

function Piece({ id, build }: { id: PieceId; build: Build }) {
  const group = useRef<Group>(null)
  usePiece(id, group, build.solid, USES[id])
  return (
    <group ref={group}>
      <mesh geometry={geometryOf(build)} material={material} />
    </group>
  )
}

/** Everything movable in the room except the record player, bought pieces included once owned. In world units, like the room. */
export function Furniture() {
  useOwned((s) => s.owned) // re-render when something's bought
  return (
    <>
      {placed().map((p) => {
        const build = BUILDS[p.id]
        return build ? <Piece key={p.id} id={p.id} build={build} /> : null
      })}
    </>
  )
}
