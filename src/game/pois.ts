import { projects, stationPos } from './projects'

// Points of interest: the single list that roads and the minimap are built from.
// Add a place here (and place its object at the same x/z) to give it a road and a map icon.

export type PoiKind = 'home' | 'project' | 'music'
export type Poi = { kind: PoiKind; x: number; z: number; label: string }

/** Spawn; every road starts from the plaza here. */
export const HUB = { x: 0, z: 0 }
/** About one screen-width to the right of spawn. */
export const RECORD_PLAYER = { x: 19, z: 0 }

export const pois: Poi[] = [
  { kind: 'home', ...HUB, label: 'Start' },
  ...stationPos.map((p, i) => ({ kind: 'project' as const, x: p.x, z: p.z, label: projects[i].title })),
  { kind: 'music', ...RECORD_PLAYER, label: 'Record player' },
]

export const PLAZA_RADIUS = 1.8
const STOP_SHORT = 0.9 // roads end this far from the POI's centre, at its doorstep
const BEND = 0.12 // sideways bow of each road as a fraction of its length; alternates side per road
const SAMPLES = 12

type Point = { x: number; z: number }

/** Each road as a polyline from the plaza edge to its POI, gently curved. Computed once. */
export const roads: Point[][] = pois
  .filter((p) => p.kind !== 'home')
  .map((p, i) => {
    const dx = p.x - HUB.x
    const dz = p.z - HUB.z
    const len = Math.hypot(dx, dz)
    const ux = dx / len
    const uz = dz / len
    const a = { x: HUB.x + ux * PLAZA_RADIUS, z: HUB.z + uz * PLAZA_RADIUS }
    const b = { x: p.x - ux * STOP_SHORT, z: p.z - uz * STOP_SHORT }
    const bow = len * BEND * (i % 2 ? -1 : 1)
    const c = { x: (a.x + b.x) / 2 - uz * bow, z: (a.z + b.z) / 2 + ux * bow } // control point, pushed sideways
    const pts: Point[] = []
    for (let s = 0; s <= SAMPLES; s++) {
      const t = s / SAMPLES
      const m = 1 - t
      pts.push({ x: m * m * a.x + 2 * m * t * c.x + t * t * b.x, z: m * m * a.z + 2 * m * t * c.z + t * t * b.z })
    }
    return pts
  })
