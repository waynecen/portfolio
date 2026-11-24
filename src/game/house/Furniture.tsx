import { lazy, Suspense, useEffect, useRef, type RefObject } from 'react'
import { Color, CylinderGeometry, MeshLambertMaterial, type BufferGeometry, type Group } from 'three'
import { addCollider, type Collider } from '../core/collision'
import { useEdit } from './edit'
import { centreOf, PIECE, placed, useOwned, useRoom, type PieceId } from './room'
import { block, merge, tint } from '../core/geometry'
import { register, say, type Interactable } from '../core/interact'
import { hint, keyName, keysName, type Action } from '../core/keymap'
import { takeSword, useArmed } from '../combat/armed'
import { fanfare } from '../core/sfx'
import { INTERIOR } from '../world/layout'
import { isTouch } from '../core/quality'
import { useGame } from '../core/store'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'
import { shadeMaterial } from './RoomLights'
import { useTrophy } from './trophy'

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

/**
 * Lines in the note on the table: the first thing to read. Only walking and using things; the rest is
 * met out in the world (first-time lines, prompts) and listed under Keys in the settings (keymap.ts).
 */
const note = () =>
  isTouch
    ? ['Welcome home! This little world is my portfolio.', 'Drag the joystick to walk, and tap A to read, talk or use whatever is nearby.', 'The rest you’ll find out there.']
    : [
        'Welcome home! This little world is my portfolio.',
        `Walk with ${['forward', 'left', 'back', 'right'].map((k) => keyName(k as Action)).join('')} or the arrow keys, and press ${keysName('interact')} to read, talk or use whatever is nearby.`,
        `The rest you’ll find out there. Every key is listed in the settings (${keyName('settings')}).`,
      ]
const NOTE_AT = { x: -0.1, z: 0 } // on the table, from its centre

function cylinder(x: number, z: number, r0: number, r1: number, y0: number, y1: number, color: Color) {
  return tint(new CylinderGeometry(r1, r0, y1 - y0, 10).translate(x, (y0 + y1) / 2, z), color)
}

// Each piece's look, centred on its footprint, and what you bump into. Pieces with the same
// builder (the pots) share one geometry.
// glow: parts drawn in the lit paper of RoomLights.tsx, which brightens at night.
type Build = { parts: (box: Box, add: (g: BufferGeometry) => void) => void; glow?: BufferGeometry; solid: Collider[] }
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
  solid: [{ kind: 'box', x: 0, z: -0.03, hx: 0.49, hz: 0.93 }], // as wide as the model (MODELS.bed)
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
  },
  glow: new CylinderGeometry(0.24, 0.2, 0.4, 10).translate(0, 1.1, 0), // the shade, lit from inside (and by RoomLights.tsx's light)
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

// Tripo models (models-src, through npm run models) in place of a piece's blocks, which stand in
// while the model downloads. Fitted to `width` across; `depth` stretches it front to back to fill its
// tiles and `height` up or down; `z` nudges it back or forward on them. Colliders stay the Build's.
const PropModel = lazy(() => import('./PropModel'))
const MODELS: Partial<Record<PieceId, { url: string; width: number; depth?: number; height?: number; z?: number }>> = {
  bed: { url: '/models/bed.glb', width: 0.98, depth: 1.8, z: -0.03 }, // its shape is stubbier than the 1 × 2 tiles, so it's lengthened
  chest: { url: '/models/chest.glb', width: 0.8, z: -0.15 }, // at the back of its tile, like its blocks
  table: { url: '/models/table.glb', width: 1.9, depth: 0.9, height: 0.6 }, // its blocks' footprint and height: the model is squarer and lower
  stool: { url: '/models/stool.glb', width: 0.5 },
}

const BUILDS: Partial<Record<PieceId, Build>> = {
  bed: BED, dresser: DRESSER, table: TABLE, stool: STOOL,
  pot1: POT, pot2: POT, pot3: POT, chest: CHEST, rug: RUG,
  lamp: LAMP, plant: PLANT, shelf: SHELF,
} // the record player draws itself (RecordPlayer.tsx)

// The golf trophy (trophy.ts), on the dresser between two jars once Gull Rock Links is finished under par.
const TROPHY_AT = { x: -0.35, y: 1.06, z: -0.33 } // from the dresser's centre: its top, between the left and middle jars
const GOLD = new Color('#ffd447') // brighter than the jars' amber, so it reads as the cup
const trophy = merge([
  tint(block(-0.11, 0.11, 0, 0.07, -0.09, 0.09), C.cap), // a wooden plinth
  cylinder(0, 0, 0.05, 0.035, 0.07, 0.2, GOLD), // the stem
  cylinder(0, 0, 0.055, 0.125, 0.2, 0.42, GOLD), // the cup, widening to the rim
  tint(block(-0.165, -0.12, 0.25, 0.37, -0.018, 0.018), GOLD), // two handles
  tint(block(0.12, 0.165, 0.25, 0.37, -0.018, 0.018), GOLD),
]).translate(TROPHY_AT.x, TROPHY_AT.y, TROPHY_AT.z)
const TROPHY_USE = {
  dx: TROPHY_AT.x,
  dz: TROPHY_AT.z,
  range: 1.4,
  prompt: 'Look',
  onInteract: () => say(['A little gold cup: Gull Rock Links, finished under par.', 'The islet’s just a row away if you fancy beating it.']),
}

// The sword starts in the chest beside the bed (combat/armed.ts): opening it hands it over, once.
const CHEST_USE = { dx: 0, dz: 0.15, range: 1.3 }
const CHEST_OPEN = {
  ...CHEST_USE,
  prompt: 'Open',
  onInteract: () => {
    takeSword()
    fanfare()
    say([
      'You lift the lid. Under a folded blanket: a little wooden sword!',
      `${hint('Click, or press {attack*},', 'Tap B')} to swing it. Hold it after a swing, then let go once it glows, to spin.`,
      'Tall grass, pots and slimes had better watch out.',
    ])
  },
}
const CHEST_EMPTY = { ...CHEST_USE, prompt: 'Look', onInteract: () => say(['Just a spare blanket now. The sword’s with you.']) }

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

  useSceneFrame('house', ({ clock }) => {
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
  const cup = useTrophy((s) => s.golf) && id === 'dresser'
  const armed = useArmed((s) => s.sword)
  const chest = id === 'chest' ? (armed ? CHEST_EMPTY : CHEST_OPEN) : undefined
  usePiece(id, group, build.solid, cup ? TROPHY_USE : (chest ?? USES[id]))
  const model = MODELS[id]
  const blocks = <mesh geometry={geometryOf(build)} material={material} />
  return (
    <group ref={group}>
      {model ? (
        <Suspense fallback={blocks}>
          <PropModel {...model} />
        </Suspense>
      ) : (
        blocks
      )}
      {build.glow && <mesh geometry={build.glow} material={shadeMaterial} />}
      {cup && <mesh geometry={trophy} material={material} />}
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
