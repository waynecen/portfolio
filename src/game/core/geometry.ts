import { BoxGeometry, Float32BufferAttribute, PlaneGeometry, type BufferGeometry, type Color } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Helpers for building static scenery out of many small pieces merged into one mesh per material,
// so a whole island or room costs a handful of draw calls.

/** Flat square at height y covering [x0, x1] × [z0, z1], facing up. */
export const flat = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  new PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2)

/** Box spanning [x0, x1] × [y0, y1] × [z0, z1]. */
export const block = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)

// Baked ambient occlusion: a piece with some height gets darker toward the ground (y = 0), the way
// light is blocked where things meet the floor. Flat pieces (the ground itself) are left alone. Baked
// into the vertex colours once, so it costs nothing per frame.
const AO = 0.32 // how much darker a piece is right at the ground
const AO_REACH = 0.4 // how high above the ground the darkening fades out
const AO_MIN_HEIGHT = 0.05 // pieces flatter than this are ground, not things on it

/** Paints every vertex of `g` one colour, so pieces of different shades merge into one mesh, with baked AO near the ground. */
export function tint(g: BufferGeometry, c: Color): BufferGeometry {
  const position = g.getAttribute('position')
  const n = position.count
  let low = Infinity
  let high = -Infinity
  for (let k = 0; k < n; k++) {
    const y = position.getY(k)
    low = Math.min(low, y)
    high = Math.max(high, y)
  }
  const occlude = high - low > AO_MIN_HEIGHT
  const colors = new Float32Array(n * 3)
  for (let k = 0; k < n; k++) {
    let shade = 1
    if (occlude) {
      const t = Math.min(1, Math.max(0, position.getY(k) / AO_REACH))
      shade = 1 - AO * (1 - t * t * (3 - 2 * t)) // smoothstep: soft at the top of the reach
    }
    colors[k * 3] = c.r * shade
    colors[k * 3 + 1] = c.g * shade
    colors[k * 3 + 2] = c.b * shade
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

/** Copy of `g` without an index buffer (disposing `g`), so planes and boxes merge with each other. */
export function unindexed(g: BufferGeometry): BufferGeometry {
  const out = g.toNonIndexed()
  g.dispose()
  return out
}

/** Merges `parts` into one geometry and disposes them. They must all share the same attributes. */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  return merged
}

/** Picks one of `options` from a fixed hash of three integers: random-looking, but the same on every visit. */
export function pick<T>(options: T[], a: number, b: number, c = 0): T {
  const h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) >>> 0
  return options[h % options.length]
}
