import { LINKS } from '../world/Island'

// The holes of the mini golf on the links, the islet's east lobe (Island.tsx), written as data so a
// hole is added without new code (ROADMAP I54). A green is a rectangle with a kerb round it; blocks
// stand on it for the ball to bounce off, and slopes push a rolling ball. Every hole shares the
// same green on the links (the course changes round it after each hole), so all of it is on land.
// Positions are world units.

export type Box = { x: number; z: number; hx: number; hz: number }

/** A patch of the green that tilts: a ball on it is pushed this way (units/s²). */
export type Slope = Box & { ax: number; az: number }

export type Hole = {
  /** Its name on the sign and the scorecard. */
  name: string
  par: number
  /** The putting surface, inside the kerb. */
  green: Box
  tee: { x: number; z: number }
  cup: { x: number; z: number }
  /** Walls on the green the ball bounces off. */
  blocks: Box[]
  /** Tilted patches, drawn as stripes. */
  slopes?: Slope[]
}

const GREEN: Box = { x: LINKS.x, z: LINKS.z, hx: 3.3, hz: 1.1 }
const TEE = { x: LINKS.x - 2.7, z: LINKS.z }

export const HOLES: Hole[] = [
  // A straight first putt.
  { name: 'The Straight', par: 2, green: GREEN, tee: TEE, cup: { x: LINKS.x + 2.5, z: LINKS.z }, blocks: [] },
  // A wall from the south kerb hides the cup: go round it, or bank off the north kerb.
  {
    name: 'Round the Wall',
    par: 3,
    green: GREEN,
    tee: TEE,
    cup: { x: LINKS.x + 2.4, z: LINKS.z + 0.6 },
    blocks: [{ x: LINKS.x + 0.6, z: LINKS.z + 0.25, hx: 0.12, hz: 0.85 }],
  },
  // A slope across the middle pushes the ball south: aim up it.
  {
    name: 'The Tilt',
    par: 2,
    green: GREEN,
    tee: TEE,
    cup: { x: LINKS.x + 2.5, z: LINKS.z - 0.5 },
    blocks: [],
    slopes: [{ x: LINKS.x, z: LINKS.z, hx: 1.3, hz: 1.1, ax: 0, az: 1.6 }],
  },
  // A block in the middle with a way round either side: a baffle guards the cup from the north, and a
  // slope carries the south way on.
  {
    name: 'Two Ways',
    par: 3,
    green: GREEN,
    tee: TEE,
    cup: { x: LINKS.x + 2.6, z: LINKS.z },
    blocks: [
      { x: LINKS.x, z: LINKS.z, hx: 0.9, hz: 0.45 },
      { x: LINKS.x + 1.8, z: LINKS.z - 0.55, hx: 0.1, hz: 0.55 },
    ],
    slopes: [{ x: LINKS.x, z: LINKS.z + 0.8, hx: 0.9, hz: 0.3, ax: 1.4, az: 0 }],
  },
]
