import { lazy, Suspense, useRef } from 'react'
import { AdditiveBlending, CanvasTexture, Color, ConeGeometry, CylinderGeometry, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, SphereGeometry, type BufferGeometry, type Group } from 'three'
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
import { Held } from '../core/Held'
import { shadeMaterial } from './lights'
import { useTrophy } from './trophy'
import { usePiece } from './piece'

// The room's furniture, one mesh per piece so each can be moved on its own (see room.ts and
// edit.ts). Every piece is built from placeholder blocks around its footprint's centre, and
// brings its colliders, and anything you can use on it, along when it moves.


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
  stone: new Color('#a59d93'),
  stoneDark: new Color('#8c847b'),
  soot: new Color('#2b2522'),
  log: new Color('#6b4429'),
  wicker: new Color('#c7a06a'),
  candle: new Color('#f3ead6'),
  quilt: new Color('#c4553f'),
  quiltEdge: new Color('#efe3cc'),
  orange: new Color('#f08a2c'),
  indigo: new Color('#3f5a8a'),
  blanketRoll: new Color('#e9dcc2'),
  yarn: new Color('#e08aa0'),
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
const FIREPLACE: Build = {
  // A stone hearth against the back wall: a chimney breast, a dark opening with logs (the flames are
  // <Fire>), a wooden mantel with two candles, and a hearthstone out in front.
  parts: (box, add) => {
    box(C.stoneDark, -1.35, 1.35, 0, 0.08, -0.5, 0.35) // the hearthstone
    box(C.stone, -1.2, -0.55, 0.08, 1.12, -0.5, 0.1) // the sides of the opening
    box(C.stone, 0.55, 1.2, 0.08, 1.12, -0.5, 0.1)
    box(C.stone, -0.55, 0.55, 0.8, 1.12, -0.5, 0.1) // over the opening
    box(C.soot, -0.55, 0.55, 0.08, 0.8, -0.5, -0.3) // inside, at the back
    box(C.cap, -1.35, 1.35, 1.12, 1.22, -0.5, 0.2) // the mantel
    box(C.stone, -0.85, 0.85, 1.22, 1.6, -0.5, -0.2) // the chimney breast, up to the top of the wall
    for (const [turn, y] of [[0.12, 0.15], [-0.1, 0.27]] as const)
      add(tint(new CylinderGeometry(0.07, 0.07, 0.85, 7).rotateZ(Math.PI / 2).rotateY(turn).translate(0, y, -0.12), C.log))
    for (const x of [-1.05, 0.95]) add(cylinder(x, -0.15, 0.045, 0.045, 1.22, 1.38 + (x < 0 ? 0.06 : 0), C.candle))
  },
  solid: [{ kind: 'box', x: 0, z: -0.15, hx: 1.3, hz: 0.45 }],
}
// The flames: three cones in the opening, flickering (Fire, below). Well over white, so they bloom
// (PostFX.tsx); a soft halo glows in the opening behind them, and a pool of warm light on the floor
// in front, both additive and flickering with the flames.
const FLAMES = [
  { x: -0.2, h: 0.36, r: 0.11 },
  { x: 0.02, h: 0.5, r: 0.14 },
  { x: 0.22, h: 0.32, r: 0.1 },
]
const flame = new ConeGeometry(1, 1, 7).translate(0, 0.5, 0)
const FLAME_BRIGHT = 3 // how far over white the flames are drawn, for the bloom
const flameMaterial = new MeshBasicMaterial({ color: new Color('#ff9a3c').multiplyScalar(FLAME_BRIGHT) })
const coreMaterial = new MeshBasicMaterial({ color: new Color('#ffe08a').multiplyScalar(FLAME_BRIGHT) })
const HALO = { w: 1.2, h: 0.75, y: 0.22, z: 0.06, opacity: 0.9 } // the glow in the opening, from the flames' base
const POOL = { w: 2.4, d: 1.5, z: 1.05, opacity: 0.22 } // the warm light on the floor, from the flames
function softSpot() {
  // A white spot fading to nothing at the edges, for additive glows.
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}
const spot = softSpot()
const glow = { transparent: true, depthWrite: false, blending: AdditiveBlending, map: spot }
const haloMaterial = new MeshBasicMaterial({ ...glow, color: new Color('#ff8a30').multiplyScalar(1.6) })
const poolMaterial = new MeshBasicMaterial({ ...glow, color: '#ff9a4a', polygonOffset: true, polygonOffsetFactor: -2 })
const halo = new PlaneGeometry(HALO.w, HALO.h)
const pool = new PlaneGeometry(POOL.w, POOL.d).rotateX(-Math.PI / 2)
const FIRE_Y = 0.2 // the flames' base, on the logs
const FIRE_Z = -0.1
const FIRE_USE = {
  dx: 0,
  dz: 0.5,
  range: 1.3,
  prompt: 'Look',
  onInteract: () => say(['The fire crackles and pops.', 'It’s always lit in here, rain or shine.']),
}
const LOGS_X = -0.3 // nudged left in its tile, snug against the fireplace's right side (when it's next to it, as by default)
const LOGS: Build = {
  // A wicker basket of split logs for the fire.
  parts: (_, add) => {
    add(cylinder(LOGS_X, 0, 0.26, 0.3, 0, 0.34, C.wicker))
    for (const [x, z, turn] of [[-0.08, -0.06, 0.3], [0.09, 0.05, -0.4], [0, 0.1, 1.2], [-0.02, -0.12, 2]] as const)
      add(tint(new CylinderGeometry(0.06, 0.06, 0.46, 6).rotateZ(Math.PI / 2).rotateY(turn).translate(x + LOGS_X, 0.36, z), C.log))
  },
  solid: [{ kind: 'circle', x: LOGS_X, z: 0, r: 0.3 }],
}
// The kotatsu's floor cushions, one centred on each side of it, close in (part of its piece, so
// they move with it). Solid, so the player walks round them rather than through.
const CUSHION_X = 1.24 // from the kotatsu's centre
const CUSHION_HALF = 0.34
const KOTATSU: Build = {
  // A low square table under a quilt that falls to the floor all round, a bowl of oranges on top.
  parts: (box, add) => {
    box(C.quilt, -0.85, 0.85, 0, 0.3, -0.85, 0.85)
    box(C.quiltEdge, -0.87, 0.87, 0.3, 0.34, -0.87, 0.87) // the quilt's top edge
    box(C.wood, -0.72, 0.72, 0.34, 0.42, -0.72, 0.72) // the tabletop
    add(cylinder(0, 0, 0.13, 0.17, 0.42, 0.5, C.candle)) // the bowl
    for (const [x, z] of [[-0.06, -0.04], [0.07, -0.03], [0, 0.07]]) add(tint(new SphereGeometry(0.065, 8, 6).translate(x, 0.53, z), C.orange))
  },
  solid: [
    { kind: 'box', x: 0, z: 0, hx: 0.87, hz: 0.87 },
    ...[-1, 1].map((s) => ({ kind: 'box' as const, x: s * CUSHION_X, z: 0, hx: CUSHION_HALF, hz: CUSHION_HALF })),
  ],
}
const ZABUTON: Build = {
  // A flat floor cushion with a tassel tied in the middle.
  parts: (box) => {
    box(C.indigo, -0.34, 0.34, 0, 0.16, -0.34, 0.34)
    box(C.quiltEdge, -0.04, 0.04, 0.16, 0.18, -0.04, 0.04)
  },
  solid: [],
}
const BASKET: Build = {
  // A wicker basket of rolled blankets, with a ball of yarn on top.
  parts: (_, add) => {
    add(cylinder(0, 0, 0.26, 0.3, 0, 0.32, C.wicker))
    add(tint(new CylinderGeometry(0.1, 0.1, 0.5, 8).rotateZ(Math.PI / 2).translate(0, 0.36, -0.08), C.blanketRoll))
    add(tint(new CylinderGeometry(0.09, 0.09, 0.46, 8).rotateZ(Math.PI / 2).rotateY(0.3).translate(0, 0.38, 0.1), C.blanket))
    add(tint(new SphereGeometry(0.08, 8, 6).translate(0.12, 0.5, 0), C.yarn))
  },
  solid: [{ kind: 'circle', x: 0, z: 0, r: 0.3 }],
}
const COAT_STAND: Build = {
  // A tall pole on a cross of feet, a scarf and a hat on its pegs.
  parts: (box, add) => {
    box(C.wood, -0.25, 0.25, 0, 0.05, -0.04, 0.04)
    box(C.wood, -0.04, 0.04, 0, 0.05, -0.25, 0.25)
    add(cylinder(0, 0, 0.035, 0.03, 0.05, 1.55, C.wood))
    for (const a of [0.4, 2.0, 3.6, 5.2]) box(C.cap, Math.cos(a) * 0.12 - 0.02, Math.cos(a) * 0.12 + 0.02, 1.38, 1.42, Math.sin(a) * 0.12 - 0.02, Math.sin(a) * 0.12 + 0.02)
    box(new Color('#c45a4a'), 0.04, 0.12, 0.85, 1.38, 0.0, 0.08) // a red scarf hanging down
    add(cylinder(-0.1, -0.05, 0.13, 0.13, 1.4, 1.43, new Color('#d9b24a'))) // a straw hat's brim
    add(cylinder(-0.1, -0.05, 0.07, 0.08, 1.43, 1.53, new Color('#d9b24a'))) // and crown
  },
  solid: [{ kind: 'circle', x: 0, z: 0, r: 0.22 }],
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
// The kotatsu's two cushions share one model, squared to their blocks and a little flatter than its own shape (0.21 at this width).
const ZABUTON_MODEL = { url: '/models/zabuton.glb', width: 0.68, depth: 0.68, height: 0.16 }
const MODELS: Partial<Record<PieceId, { url: string; width: number; depth?: number; height?: number; x?: number; z?: number; flat?: boolean; fill?: { day: number; night: number } }>> = {
  bed: { url: '/models/bed.glb', width: 0.98, depth: 1.8, z: -0.03 }, // its shape is stubbier than the 1 × 2 tiles, so it's lengthened
  chest: { url: '/models/chest.glb', width: 0.8, z: -0.15 }, // at the back of its tile, like its blocks
  table: { url: '/models/table.glb', width: 1.9, depth: 0.9, height: 0.6 }, // its blocks' footprint and height: the model is squarer and lower
  stool: { url: '/models/stool.glb', width: 0.5 },
  fireplace: { url: '/models/fireplace.glb', width: 2.6, depth: 0.85, height: 1.6, z: -0.08 }, // its blocks' footprint, up to the top of the wall: the model is squarer
  rug: { url: '/models/rug.glb', width: 2.9, depth: 1.9, height: 0.03, flat: true }, // its blocks' footprint, a little proud of the floor; the model was made standing up
  // Its own height, 1.3 to the top of the shade like its blocks; a strong fill makes the pale paper shade
  // glow, most at night (the stand is dark, so it barely does), and RoomLights.tsx lights the room from it.
  lamp: { url: '/models/lamp.glb', width: 0.46, fill: { day: 0.35, night: 1 } },
  logs: { url: '/models/logs.glb', width: 0.6, x: LOGS_X }, // its blocks' width, its own height (0.52)
  kotatsu: { url: '/models/kotatsu.glb', width: 1.74, depth: 1.74, height: 0.88 }, // its blocks' footprint, a little lower than its own shape (1.04 at this width)
}

const BUILDS: Partial<Record<PieceId, Build>> = {
  bed: BED, fireplace: FIREPLACE, table: TABLE, stool: STOOL,
  logs: LOGS, coatStand: COAT_STAND,
  kotatsu: KOTATSU, basket: BASKET,
  pot2: POT, pot3: POT, chest: CHEST, rug: RUG,
  lamp: LAMP, plant: PLANT, shelf: SHELF,
} // the record player draws itself (RecordPlayer.tsx)

// The golf trophy (trophy.ts), on the mantelpiece once Gull Rock Links is finished under par.
const TROPHY_AT = { x: 0, y: 1.26, z: -0.12 } // from the fireplace's centre: in the middle of the model's mantel, between its candle and its picture
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
      `${hint('Click, or press {attack*},', 'Tap A')} to swing it. Hold it after a swing, then let go once it glows, to spin.`,
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
const cushion = <mesh geometry={geometryOf(ZABUTON)} material={material} />

// The fireplace neither casts nor takes shadows (Shadows.tsx): its own light sits just in front of it,
// and its shadow map lit a bright rim round the stones' edges. It stands against the wall, so nothing's lost.
const SHADOWLESS = { noShadow: true }

/** Things to use on a piece, from its centre. */
const USES: Partial<Record<PieceId, Omit<Interactable, 'x' | 'z'> & { dx: number; dz: number }>> = {
  table: { dx: NOTE_AT.x, dz: NOTE_AT.z, range: 1.4, prompt: 'Read', onInteract: () => say(note()) },
  fireplace: FIRE_USE,
}

function Piece({ id, build }: { id: PieceId; build: Build }) {
  const group = useRef<Group>(null)
  const cup = useTrophy((s) => s.golf) && id === 'fireplace'
  const armed = useArmed((s) => s.sword)
  const chest = id === 'chest' ? (armed ? CHEST_EMPTY : CHEST_OPEN) : undefined
  usePiece(id, group, build.solid, cup ? TROPHY_USE : (chest ?? USES[id]))
  const model = MODELS[id]
  const blocks = <mesh geometry={geometryOf(build)} material={material} />
  const glow = build.glow && <mesh geometry={build.glow} material={shadeMaterial} /> // a model has its own (the lamp's fill)
  return (
    <group ref={group} userData={id === 'fireplace' ? SHADOWLESS : undefined}>
      {model ? (
        <Suspense
          fallback={
            <Held>
              {blocks}
              {glow}
            </Held>
          }
        >
          <PropModel {...model} />
        </Suspense>
      ) : (
        <>
          {blocks}
          {glow}
        </>
      )}
      {cup && <mesh geometry={trophy} material={material} />}
      {id === 'fireplace' && <Fire />}
      {id === 'kotatsu' &&
        [-1, 1].map((s) => (
          <group key={s} position-x={s * CUSHION_X}>
            <Suspense fallback={<Held>{cushion}</Held>}>
              <PropModel {...ZABUTON_MODEL} />
            </Suspense>
          </group>
        ))}
    </group>
  )
}

/** The fireplace's flames, flickering (gently with reduced motion). Its light is RoomLights.tsx's. */
function Fire() {
  const flames = useRef<(Group | null)[]>([])
  useSceneFrame('house', ({ clock }) => {
    const t = clock.elapsedTime
    const k = reducedMotion() ? 0.3 : 1
    const flick = 1 + k * (0.12 * Math.sin(t * 9) + 0.08 * Math.sin(t * 23 + 1))
    haloMaterial.opacity = HALO.opacity * flick
    poolMaterial.opacity = POOL.opacity * flick
    flames.current.forEach((g, n) => {
      if (!g) return
      const f = FLAMES[n]
      const flick = 1 + k * (0.18 * Math.sin(t * 9 + n * 2.1) + 0.1 * Math.sin(t * 23 + n * 5.3))
      g.scale.set(f.r * (2 - flick) ** 0.5, f.h * flick, f.r * (2 - flick) ** 0.5)
    })
  })
  return (
    <group position={[0, FIRE_Y, FIRE_Z]} userData={{ noShadow: true }}>
      {FLAMES.map((f, n) => (
        <group
          key={n}
          position-x={f.x}
          ref={(el) => {
            flames.current[n] = el
          }}
        >
          <mesh geometry={flame} material={flameMaterial} />
          <mesh geometry={flame} material={coreMaterial} scale={[0.5, 0.6, 0.5]} position-z={0.03} />
        </group>
      ))}
      <mesh geometry={halo} material={haloMaterial} position={[0, HALO.y, HALO.z]} />
      <mesh geometry={pool} material={poolMaterial} position={[0, 0.012 - FIRE_Y, POOL.z]} />
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
