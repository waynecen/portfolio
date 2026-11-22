import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, DoubleSide, MeshBasicMaterial, MeshLambertMaterial, Shape, ShapeGeometry, SphereGeometry, Object3D, type BufferGeometry, type Group, type InstancedMesh, type Mesh } from 'three'
import { block, merge, tint, unindexed } from '../core/geometry'
import { register } from '../core/interact'
import { useSceneFrame } from '../core/sceneFrame'
import { reducedMotion, useSettings } from '../core/settings'
import { useGame } from '../core/store'
import { Sign } from '../portfolio/Sign'
import { aim, ball, BALL_R, ballSpot, CUP_R, dragEnd, dragMove, dragStart, stepGolf, useGolf } from './golf'
import { HOLES, type Hole } from './holes'

// The mini golf on the links (golf.ts has the rules): a felt green with a wooden kerb, the cup and
// its flag, the ball, and a dotted aim line that shows the first bounce while lining up a putt.

const FELT_Y = 0.03 // the green stands this proud of the grass
const KERB_W = 0.12
const KERB_H = 0.13
const DOTS = 14
const DOT_GAP = 0.2 // between aim dots
const AIM_MIN = 0.8 // the aim line's length at no power...
const AIM_MAX = 3 // ...and at full power
const AIM_GENTLE = 1.5 // gentle greens (settings.ts) make the aim line this much longer
const SLOPE_STRIPES = 5 // stripes across a slope, running the way it pushes
const SLOPE = new Color('#7cc26f')

const FELT = new Color('#5fae5a')
const FELT_DARK = new Color('#4f9a4c')
const KERB = new Color('#b98a5a')
const KERB_TOP = new Color('#d6aa78')

function buildGreen(h: Hole): BufferGeometry {
  const g = h.green
  const parts: BufferGeometry[] = []
  // Felt in two shades of stripe, across the length of the green.
  const stripes = Math.max(2, Math.round(g.hx * 2))
  for (let k = 0; k < stripes; k++) {
    const x0 = g.x - g.hx + (k * 2 * g.hx) / stripes
    parts.push(tint(block(x0, x0 + (2 * g.hx) / stripes, 0, FELT_Y, g.z - g.hz, g.z + g.hz), k % 2 ? FELT_DARK : FELT))
  }
  const x0 = g.x - g.hx - KERB_W
  const x1 = g.x + g.hx + KERB_W
  const z0 = g.z - g.hz - KERB_W
  const z1 = g.z + g.hz + KERB_W
  for (const [a, b, c, d] of [
    [x0, x1, z0, g.z - g.hz],
    [x0, x1, g.z + g.hz, z1],
    [x0, g.x - g.hx, z0, z1],
    [g.x + g.hx, x1, z0, z1],
  ]) {
    parts.push(tint(block(a, b, 0, KERB_H - 0.02, c, d), KERB))
    parts.push(tint(block(a, b, KERB_H - 0.02, KERB_H, c, d), KERB_TOP))
  }
  // Slopes: lighter stripes along the way they push, just proud of the felt.
  for (const s of h.slopes ?? []) {
    const along = Math.abs(s.ax) > Math.abs(s.az) // pushing along x: stripes run along x
    for (let k = 0; k < SLOPE_STRIPES; k++) {
      if (k % 2) continue
      if (along) {
        const z0 = s.z - s.hz + (k * 2 * s.hz) / SLOPE_STRIPES
        parts.push(tint(block(s.x - s.hx, s.x + s.hx, FELT_Y, FELT_Y + 0.004, z0, z0 + (2 * s.hz) / SLOPE_STRIPES), SLOPE))
      } else {
        const x0 = s.x - s.hx + (k * 2 * s.hx) / SLOPE_STRIPES
        parts.push(tint(block(x0, x0 + (2 * s.hx) / SLOPE_STRIPES, FELT_Y, FELT_Y + 0.004, s.z - s.hz, s.z + s.hz), SLOPE))
      }
    }
  }
  for (const b of h.blocks) parts.push(tint(block(b.x - b.hx, b.x + b.hx, 0, KERB_H * 1.6, b.z - b.hz, b.z + b.hz), KERB))
  return merge(parts.map(unindexed))
}

const wood = new MeshLambertMaterial({ vertexColors: true, flatShading: true })
const cupGeometry = new CylinderGeometry(CUP_R + 0.02, CUP_R + 0.02, 0.005, 16)
const cupMaterial = new MeshBasicMaterial({ color: '#1f2a1e' })
const poleGeometry = new CylinderGeometry(0.014, 0.014, 0.9, 6).translate(0, 0.45, 0)
const poleMaterial = new MeshLambertMaterial({ color: '#f4f1e8' })
const flagShape = new Shape()
flagShape.moveTo(0, 0)
flagShape.lineTo(0.34, -0.09)
flagShape.lineTo(0, -0.18)
const flagGeometry = new ShapeGeometry(flagShape).translate(0.012, 0.9, 0)
const flagMaterial = new MeshLambertMaterial({ color: '#e2574c', side: DoubleSide })
const ballGeometry = new SphereGeometry(BALL_R, 14, 10)
const ballMaterial = new MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.15 })
const dotGeometry = new SphereGeometry(0.03, 6, 4)
const dotMaterial = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })
const scratch = new Object3D() // for writing the dots' matrices, so the frame loop allocates nothing

/** Where the aim line goes: along the aim, bouncing off the kerb once, `len` long. Writes dot positions into `out` as (x, z) pairs, NaN where there's no dot. */
function traceAim(h: Hole, len: number, out: Float32Array) {
  const g = h.green
  const x0 = g.x - g.hx + BALL_R
  const x1 = g.x + g.hx - BALL_R
  const z0 = g.z - g.hz + BALL_R
  const z1 = g.z + g.hz - BALL_R
  let x = ball.x
  let z = ball.z
  let dx = Math.sin(aim.angle)
  let dz = Math.cos(aim.angle)
  let bounces = 0
  let dist = 0
  for (let k = 0; k < DOTS; k++) {
    const want = (k + 1) * DOT_GAP
    if (want > len || bounces > 1) {
      out[k * 2] = NaN
      continue
    }
    let step = want - dist
    while (step > 0 && bounces <= 1) {
      const tx = dx > 0 ? (x1 - x) / dx : dx < 0 ? (x0 - x) / dx : Infinity
      const tz = dz > 0 ? (z1 - z) / dz : dz < 0 ? (z0 - z) / dz : Infinity
      const t = Math.max(0, Math.min(tx, tz))
      if (t >= step) {
        x += dx * step
        z += dz * step
        break
      }
      x += dx * t
      z += dz * t
      step -= t
      if (tx <= tz) dx = -dx
      else dz = -dz
      bounces++
    }
    dist = want
    out[k * 2] = bounces > 1 ? NaN : x
    out[k * 2 + 1] = z
  }
}

function Green({ hole }: { hole: Hole }) {
  const geometry = useMemo(() => buildGreen(hole), [hole])
  const flag = useRef<Mesh>(null)
  const ballMesh = useRef<Mesh>(null)
  const dots = useRef<InstancedMesh>(null)
  const at = useMemo(() => new Float32Array(DOTS * 2), [])
  const group = useRef<Group>(null)

  useSceneFrame('world', ({ clock }, delta) => {
    stepGolf(Math.min(delta, 0.1))
    const { phase, charging } = useGolf.getState()
    const b = ballMesh.current
    if (b) b.position.set(ball.x, phase === 'sunk' ? FELT_Y - BALL_R * 1.2 : FELT_Y + BALL_R, ball.z)
    if (flag.current && !reducedMotion()) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2.3) * 0.25
    // The aim line, only while lining up.
    const d = dots.current
    if (!d) return
    d.visible = phase === 'aim'
    if (!d.visible) return
    const gentle = useSettings.getState().golfAssist ? AIM_GENTLE : 1
    traceAim(hole, (AIM_MIN + (AIM_MAX - AIM_MIN) * (charging ? aim.power : 0)) * gentle, at)
    let n = 0
    for (let k = 0; k < DOTS; k++) {
      const x = at[k * 2]
      if (Number.isNaN(x)) continue
      scratch.position.set(x, FELT_Y + 0.03, at[k * 2 + 1])
      scratch.updateMatrix()
      d.setMatrixAt(n++, scratch.matrix)
    }
    d.count = n
    d.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={wood} />
      <mesh geometry={cupGeometry} material={cupMaterial} position={[hole.cup.x, FELT_Y + 0.003, hole.cup.z]} />
      <group position={[hole.cup.x, FELT_Y, hole.cup.z]}>
        <mesh geometry={poleGeometry} material={poleMaterial} />
        <mesh ref={flag} geometry={flagGeometry} material={flagMaterial} />
      </group>
      <mesh ref={ballMesh} geometry={ballGeometry} material={ballMaterial} />
      <instancedMesh ref={dots} args={[dotGeometry, dotMaterial, DOTS]} frustumCulled={false} />
    </group>
  )
}


/** The links: the hole, its sign at the tee, and the ball's use point. */
export function Course() {
  const hole = useGolf((s) => HOLES[s.hole])
  const gl = useThree((s) => s.gl)
  useEffect(() => register(ballSpot), [])
  // A drag on the game while lining up a putt (mouse or touch): pull back and let go.
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      if (!useGame.getState().putting || (e.pointerType === 'mouse' && e.button !== 0)) return
      dragStart(e)
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', dragMove)
    window.addEventListener('pointerup', dragEnd)
    window.addEventListener('pointercancel', dragEnd)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', dragMove)
      window.removeEventListener('pointerup', dragEnd)
      window.removeEventListener('pointercancel', dragEnd)
    }
  }, [gl])
  const n = HOLES.indexOf(hole) + 1
  const g = hole.green
  return (
    <>
      <Green hole={hole} />
      <Sign
        x={hole.tee.x - 0.6}
        z={g.z - g.hz - 0.8}
        lines={[`“Gull Rock Links. Hole ${n}: ${hole.name}. Par ${hole.par}.”`, 'Walk up to the ball to take a putt. Fewest strokes wins; there’s no hurry.']}
      />
    </>
  )
}
