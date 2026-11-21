import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { CanvasTexture, Color, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, RepeatWrapping, SphereGeometry, type BufferGeometry, type Mesh } from 'three'
import { addCollider } from './core/collision'
import { block, merge, pick, tint } from './core/geometry'
import { CAVE_MOUTH, OUTCROP } from './world/layout'
import { reducedMotion } from './core/settings'
import { winter } from './world/season'

// A rocky outcrop on the island's north shore with a waterfall pouring down its front, over the
// mouth of a cave (CaveRooms.tsx; walking in is in Doors.tsx). Built from blocks like the cliffs, the
// water a strip of moving stripes, with spray where it lands.

const TOP = 2.2 // height of the outcrop
const STEP = 0.9 // its upper tier sits back this far from the front
const LOWER = 1.4 // and starts at this height
const MOUTH_W = 0.6 // half-width of the mouth
const MOUTH_H = 1.15
const FALL_W = 0.72 // half-width of the falling water, a little wider than the mouth
const FLOW = 1.4 // how fast the water's stripes fall (texture repeats per second)

const X0 = OUTCROP.i0 - 0.5
const X1 = OUTCROP.i1 + 0.5
const Z0 = OUTCROP.j0 - 0.5
const Z1 = OUTCROP.j1 + 0.5
const MX = CAVE_MOUTH.x

const STONE = ['#b9ae98', '#aea38d', '#c4baa6'].map((c) => new Color(c))
const TOP_COLOR = new Color(winter ? '#eef3f8' : '#8cc084')
const DARK = new Color('#1c1a20')

function build(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const rock = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k: number) =>
    parts.push(tint(block(x0, x1, y0, y1, z0, z1), pick(STONE, Math.round(x0 * 3), Math.round(y0 * 5), k)))
  // The lower tier, either side of the mouth and over it.
  rock(X0, MX - MOUTH_W, 0, LOWER, Z0, Z1, 1)
  rock(MX + MOUTH_W, X1, 0, LOWER, Z0, Z1, 2)
  rock(MX - MOUTH_W, MX + MOUTH_W, MOUTH_H, LOWER, Z0, Z1, 3)
  rock(MX - MOUTH_W, MX + MOUTH_W, 0, MOUTH_H, Z0, Z1 - 1, 4) // the back of the mouth
  // The upper tier, set back, with grass (or snow) on both.
  rock(X0 + 0.2, X1 - 0.2, LOWER, TOP, Z0, Z1 - STEP, 5)
  parts.push(tint(block(X0 + 0.2, X1 - 0.2, TOP, TOP + 0.05, Z0, Z1 - STEP), TOP_COLOR))
  parts.push(tint(block(X0, MX - FALL_W, LOWER, LOWER + 0.05, Z1 - STEP, Z1), TOP_COLOR))
  parts.push(tint(block(MX + FALL_W, X1, LOWER, LOWER + 0.05, Z1 - STEP, Z1), TOP_COLOR))
  // The dark inside of the mouth, so it reads as a way in.
  parts.push(tint(block(MX - MOUTH_W, MX + MOUTH_W, 0, MOUTH_H, Z1 - 1, Z1 - 0.98), DARK))
  return merge(parts)
}
const rocks = build()

// Falling water: soft vertical streaks, drawn once and scrolled down.
function streaks() {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#9fd3ea'
  g.fillRect(0, 0, 32, 64)
  for (let k = 0; k < 14; k++) {
    g.fillStyle = k % 3 ? 'rgba(255,255,255,0.55)' : 'rgba(120,180,215,0.6)'
    g.fillRect((k * 7) % 32, (k * 23) % 64, 2 + (k % 2), 12 + (k % 4) * 6)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(1, 2)
  return t
}
const water = new MeshBasicMaterial({ map: streaks(), transparent: true, opacity: 0.82, depthWrite: false })
// From the top of the upper tier, down its face, over the lower tier's lip and down to the ground.
const upperFall = new PlaneGeometry(2 * FALL_W, TOP - LOWER).translate(MX, (TOP + LOWER) / 2, Z1 - STEP + 0.02)
const lip = new PlaneGeometry(2 * FALL_W, STEP).rotateX(-Math.PI / 2).translate(MX, LOWER + 0.07, Z1 - STEP / 2)
const lowerFall = new PlaneGeometry(2 * FALL_W, LOWER).translate(MX, LOWER / 2, Z1 + 0.03)

const sprayGeometry = new SphereGeometry(0.12, 6, 4)
const spray = new MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 })
const PUFFS = 6

export function Waterfall() {
  const puffs = useRef<(Mesh | null)[]>([])
  useEffect(() => {
    // Solid either side of the mouth and behind it; the mouth itself is open to walk into.
    const removers = [
      addCollider({ kind: 'box', x: (X0 + MX - MOUTH_W) / 2, z: (Z0 + Z1) / 2, hx: (MX - MOUTH_W - X0) / 2, hz: (Z1 - Z0) / 2 }),
      addCollider({ kind: 'box', x: (MX + MOUTH_W + X1) / 2, z: (Z0 + Z1) / 2, hx: (X1 - MX - MOUTH_W) / 2, hz: (Z1 - Z0) / 2 }),
      addCollider({ kind: 'box', x: MX, z: (Z0 + Z1 - 1) / 2, hx: MOUTH_W, hz: (Z1 - 1 - Z0) / 2 }),
    ]
    return () => removers.forEach((r) => r())
  }, [])
  useFrame(({ clock }, delta) => {
    if (reducedMotion()) return
    water.map!.offset.y += FLOW * Math.min(delta, 0.1)
    const t = clock.elapsedTime
    for (let k = 0; k < PUFFS; k++) {
      const m = puffs.current[k]
      if (!m) continue
      const p = (t * 1.3 + k / PUFFS) % 1
      m.position.y = 0.05 + p * 0.35
      m.scale.setScalar(0.6 + p * 0.9)
      m.visible = p < 0.9
    }
  })
  return (
    <>
      <mesh geometry={rocks}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <mesh geometry={upperFall} material={water} />
      <mesh geometry={lip} material={water} />
      <mesh geometry={lowerFall} material={water} />
      {Array.from({ length: PUFFS }, (_, k) => (
        <mesh
          key={k}
          ref={(m) => {
            puffs.current[k] = m
          }}
          geometry={sprayGeometry}
          material={spray}
          position={[MX + (k / (PUFFS - 1) - 0.5) * 2 * FALL_W, 0.1, Z1 + 0.12]}
        />
      ))}
    </>
  )
}
