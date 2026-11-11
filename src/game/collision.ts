// Static collision for a top-down world: the player is a circle on the XZ plane, obstacles are
// circles or axis-aligned boxes. Hand-rolled instead of a physics engine: a few comparisons per
// collider, nothing allocated per frame.

export type Collider =
  | { kind: 'circle'; x: number; z: number; r: number }
  /** Axis-aligned box: centre plus half-width (x) and half-depth (z). */
  | { kind: 'box'; x: number; z: number; hx: number; hz: number }

// Flat list for now; swap for a spatial grid once the map has hundreds of obstacles.
export const colliders: Collider[] = []

/** Adds a collider; returns a function that removes it (use as an effect cleanup). */
export function addCollider(c: Collider): () => void {
  colliders.push(c)
  return () => {
    const i = colliders.indexOf(c)
    if (i >= 0) colliders.splice(i, 1)
  }
}

type Vec = { x: number; z: number }

// Pushes `pos` out along (nx, nz) by `depth`, and removes the part of `vel` heading into the
// obstacle so the player slides along it instead of sticking.
function push(pos: Vec, vel: Vec, nx: number, nz: number, depth: number) {
  pos.x += nx * depth
  pos.z += nz * depth
  const into = vel.x * nx + vel.z * nz
  if (into < 0) {
    vel.x -= into * nx
    vel.z -= into * nz
  }
}

/**
 * Moves a circle of radius `r` at `pos` out of every collider it overlaps, in place.
 * Two passes, so being wedged between two obstacles settles cleanly.
 */
export function resolve(pos: Vec, r: number, vel: Vec) {
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i]
      if (c.kind === 'circle') {
        const dx = pos.x - c.x
        const dz = pos.z - c.z
        const min = r + c.r
        const d2 = dx * dx + dz * dz
        if (d2 >= min * min) continue
        const d = Math.sqrt(d2)
        if (d < 1e-6) push(pos, vel, 0, 1, min) // dead centre: pick a direction
        else push(pos, vel, dx / d, dz / d, min - d)
      } else {
        // Closest point on the box to the circle's centre.
        const cx = Math.max(c.x - c.hx, Math.min(pos.x, c.x + c.hx))
        const cz = Math.max(c.z - c.hz, Math.min(pos.z, c.z + c.hz))
        const dx = pos.x - cx
        const dz = pos.z - cz
        const d2 = dx * dx + dz * dz
        if (d2 >= r * r) continue
        if (d2 > 1e-12) {
          const d = Math.sqrt(d2)
          push(pos, vel, dx / d, dz / d, r - d)
        } else {
          // Centre is inside the box: leave by the nearest face.
          const ox = c.hx - Math.abs(pos.x - c.x)
          const oz = c.hz - Math.abs(pos.z - c.z)
          if (ox < oz) push(pos, vel, pos.x < c.x ? -1 : 1, 0, ox + r)
          else push(pos, vel, 0, pos.z < c.z ? -1 : 1, oz + r)
        }
      }
    }
  }
}
