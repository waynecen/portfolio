import { LINKS } from '../world/Island'

// The holes of the mini golf on the links, the islet's east lobe (Island.tsx), written as data so a
// hole is added without new code (ROADMAP I54). A green is a rectangle with a kerb round it; blocks
// stand on it for the ball to bounce off. Positions are world units.

export type Box = { x: number; z: number; hx: number; hz: number }

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
}

export const HOLES: Hole[] = [
  {
    name: 'The Straight',
    par: 2,
    green: { x: LINKS.x, z: LINKS.z, hx: 3.3, hz: 1.1 },
    tee: { x: LINKS.x - 2.7, z: LINKS.z },
    cup: { x: LINKS.x + 2.5, z: LINKS.z },
    blocks: [],
  },
]
