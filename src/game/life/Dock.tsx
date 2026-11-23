import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Line,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { addCollider } from '../core/collision'
import { BARREL_AT, CAST_TIME, DOCK, DOCK_TILES, line, SPOTS, tick, toggleRod, cast, useFishing } from './fishing'
import { block, merge, pick, tint, unindexed } from '../core/geometry'
import { register } from '../core/interact'
import { isLand, WATER_Y } from '../world/Island'
import { sky } from '../world/sky'
import { playerFacing } from '../core/state'
import { reducedMotion } from '../core/settings'

// The fishing dock at the island's bottom-left (rules and catches in fishing.ts): a plank walkway
// on posts out over the water, a barrel of rods at its foot, and the ripple to fish at. While the
// line is out, a float sits on the water joined to the rod's tip by a thin line. The rod itself is
// drawn in the player's hand by <HeldRod>.

const DECK_Y = 0.06 // top of the planks, just proud of the grass
const PLANK = 0.24 // depth of each plank along the dock
const GAP = 0.035 // between planks
const START = DOCK.z0 - 0.2 // the first plank rests on the grass
const POSTS = [17, 18.3, DOCK.z1 - 0.1] // along the dock, a pair at each (keep them off the land tiles)
const PLANKS = ['#a8794f', '#9c6f47', '#b2845a'].map((c) => new Color(c))
const BEAM = new Color('#6e4a2e')
const POST = new Color('#7a5434')

const RANGE = 1.6 // how close to the ripple the player must be to cast; it's out in the water
const REEL_SWAY = 0.5 // while reeling, how far either way the float is pulled at the needle's ends
const BARREL_RANGE = 1.3
const RINGS = 3 // rings in the ripple, spreading one after another
const RIPPLE_R = 0.6 // how far a ring spreads, idle
const RIPPLE_PERIOD = 2.2 // seconds for one ring to spread and fade

function buildDock() {
  const parts: BufferGeometry[] = []
  const x0 = DOCK.x - DOCK.half
  const x1 = DOCK.x + DOCK.half
  // Planks across the walkway, each a slightly different brown.
  let n = 0
  for (let z = START; z + PLANK <= DOCK.z1 + 0.001; z += PLANK + GAP, n++)
    parts.push(tint(unindexed(block(x0, x1, DECK_Y - 0.06, DECK_Y, z, z + PLANK)), pick(PLANKS, n, 3)))
  // Two beams underneath, along its length.
  for (const x of [x0 + 0.15, x1 - 0.15])
    parts.push(tint(unindexed(block(x - 0.06, x + 0.06, DECK_Y - 0.2, DECK_Y - 0.06, START, DOCK.z1)), BEAM))
  // Posts down into the water, standing a little above the deck.
  for (const z of POSTS)
    for (const x of [x0 + 0.04, x1 - 0.04]) {
      const post = new CylinderGeometry(0.075, 0.085, 2.1, 6).translate(x, WATER_Y - 0.6 + 1.05, z)
      parts.push(tint(unindexed(post), POST))
    }
  return merge(parts)
}

function buildBarrel() {
  const parts: BufferGeometry[] = []
  const wood = new Color('#9a6a42')
  const band = new Color('#4a3a2a')
  const rod = new Color('#c9a36a')
  const reel = new Color('#5a5f66')
  parts.push(tint(unindexed(new CylinderGeometry(0.27, 0.24, 0.62, 10).translate(0, 0.31, 0)), wood))
  for (const y of [0.12, 0.5]) parts.push(tint(unindexed(new CylinderGeometry(0.285, 0.285, 0.05, 10).translate(0, y, 0)), band))
  // Rods leaning out of the top every which way, each with a little reel.
  const LEAN = [
    [0.25, 0.1],
    [-0.2, 0.9],
    [0.15, 2.1],
    [-0.28, 3.6],
  ]
  for (const [tilt, turn] of LEAN) {
    const r = new CylinderGeometry(0.012, 0.02, 1.2, 5).translate(0, 0.6, 0)
    const k = new CylinderGeometry(0.04, 0.04, 0.035, 8).rotateZ(Math.PI / 2).translate(0.035, 0.2, 0)
    for (const [g, c] of [
      [r, rod],
      [k, reel],
    ] as const) {
      g.rotateX(tilt).rotateY(turn).translate(0, 0.3, 0)
      parts.push(tint(unindexed(g), c))
    }
  }
  return merge(parts)
}

const dockGeometry = buildDock()
const barrelGeometry = buildBarrel()
const woodMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true })

const ringGeometry = new RingGeometry(0.85, 1, 28).rotateX(-Math.PI / 2)
const ringMaterials = Array.from({ length: RINGS }, () => new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }))
const shadowGeometry = new CircleGeometry(1, 12).rotateX(-Math.PI / 2).scale(0.12, 1, 0.28)
const shadowMaterial = new MeshBasicMaterial({ color: '#16384a', transparent: true, opacity: 0.35, depthWrite: false })
const floatGeometry = new SphereGeometry(0.055, 8, 6)
const floatMaterial = new MeshLambertMaterial({ color: '#e0473b', emissive: '#e0473b', emissiveIntensity: 0.25 })

/** The rod's tip in the world, written by <HeldRod> each frame; the line runs from here to the float. */
const rodTip = new Vector3()
const floatPos = new Vector3()

// The fishing line: two points, rewritten in place every frame.
const lineGeometry = new BufferGeometry()
lineGeometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
const fishingLine = new Line(lineGeometry, new LineBasicMaterial({ color: '#f4f1e8', transparent: true, opacity: 0.8 }))
fishingLine.frustumCulled = false

export function Dock() {
  const rod = useFishing((s) => s.rod)
  const spot = useFishing((s) => s.spot)
  const ripple = useRef<Group>(null)
  const rings = useRef<(Mesh | null)[]>([])
  const shadow = useRef<Mesh>(null)
  const float = useRef<Mesh>(null)
  const at = SPOTS[spot]

  // Keep to the planks: a rail of collider along each side that's over water, and one across the end.
  useEffect(() => {
    const removers: (() => void)[] = []
    for (let j = DOCK_TILES.j0; j <= DOCK_TILES.j1; j++)
      for (const side of [-1, 1])
        if (!isLand(DOCK.x + side, j))
          removers.push(addCollider({ kind: 'box', x: DOCK.x + side * (DOCK.half + 0.05), z: j, hx: 0.05, hz: 0.5 }))
    removers.push(addCollider({ kind: 'box', x: DOCK.x, z: DOCK.z1 + 0.05, hx: DOCK.half + 0.1, hz: 0.05 }))
    removers.push(addCollider({ kind: 'circle', x: BARREL_AT.x, z: BARREL_AT.z, r: 0.32 }))
    return () => removers.forEach((r) => r())
  }, [])

  useEffect(
    () =>
      register({ x: BARREL_AT.x, z: BARREL_AT.z, range: BARREL_RANGE, prompt: rod ? 'Put the rod back' : 'Take a rod', onInteract: toggleRod }),
    [rod],
  )
  useEffect(() => register({ x: at.x, z: at.z, range: RANGE, prompt: rod ? 'Fish' : 'Look', onInteract: cast }), [at, rod])

  useFrame(({ clock }, delta) => {
    tick(Math.min(delta, 0.1))
    const { phase } = useFishing.getState()
    const t = clock.elapsedTime

    // The float: flies out from the rod's tip in an arc, then rides the water; small nibbles just
    // before the bite, then pulled under, shaking, while it bites.
    const f = float.current
    if (f) {
      f.visible = phase !== 'idle'
      if (phase === 'cast') {
        const k = Math.min(1, line.t / CAST_TIME)
        floatPos.set(rodTip.x + (at.x - rodTip.x) * k, rodTip.y + (WATER_Y - rodTip.y) * k + Math.sin(Math.PI * k) * 0.9, rodTip.z + (at.z - rodTip.z) * k)
      } else {
        let y = WATER_Y + 0.03 + Math.sin(t * 2.5) * 0.012
        if (phase === 'wait' && line.biteAt - line.t < 1.2 && Math.sin(line.t * 9) > 0.6) y -= 0.035 // nibbles
        if (phase === 'bite') y = WATER_Y - 0.05 + Math.sin(t * 40) * 0.02
        floatPos.set(at.x + (phase === 'bite' ? Math.sin(t * 31) * 0.03 : 0), y, at.z)
        if (phase === 'reel') {
          // Reeling: the float is under, pulled side to side with the needle, across the line of the cast.
          const h = playerFacing.heading
          const side = line.needle * REEL_SWAY
          floatPos.set(at.x + Math.cos(h) * side, WATER_Y - 0.06 + Math.sin(t * 25) * 0.015, at.z - Math.sin(h) * side)
        }
      }
      f.position.copy(floatPos)
    }

    // The line, from the rod's tip to the float.
    fishingLine.visible = phase !== 'idle'
    if (fishingLine.visible) {
      const p = lineGeometry.getAttribute('position') as BufferAttribute
      p.setXYZ(0, rodTip.x, rodTip.y, rodTip.z)
      p.setXYZ(1, floatPos.x, floatPos.y, floatPos.z)
      p.needsUpdate = true
    }

    // The ripple: rings spreading out one after another. Wide and slow while waiting to be found,
    // tight round the float while the line is out, and fast and big while something bites.
    const g = ripple.current
    if (g) {
      g.visible = phase !== 'cast'
      const thrashing = phase === 'bite' || phase === 'reel'
      const radius = phase === 'idle' ? RIPPLE_R : thrashing ? 0.75 : 0.3
      const period = thrashing ? 0.5 : phase === 'idle' ? RIPPLE_PERIOD : 2.8
      for (let k = 0; k < RINGS; k++) {
        const m = rings.current[k]
        if (!m) continue
        const p = reducedMotion() ? 0.5 : (t / period + k / RINGS) % 1
        m.scale.setScalar(radius * (0.2 + 0.8 * p))
        ringMaterials[k].color.copy(sky.foam)
        ringMaterials[k].opacity = (1 - p) * 0.7
      }
    }
    // A dark shape circling slowly under the ripple: there's a fish there.
    const s = shadow.current
    if (s) {
      s.visible = phase === 'idle'
      const a = reducedMotion() ? 0 : t * 0.7
      s.position.set(at.x + Math.cos(a) * 0.25, WATER_Y - 0.01, at.z + Math.sin(a) * 0.25)
      s.rotation.y = -a
    }
  })

  return (
    <>
      <mesh geometry={dockGeometry} material={woodMaterial} />
      <mesh geometry={barrelGeometry} material={woodMaterial} position={[BARREL_AT.x, 0, BARREL_AT.z]} />
      <group ref={ripple} position={[at.x, WATER_Y + 0.02, at.z]}>
        {ringMaterials.map((m, k) => (
          <mesh
            key={k}
            ref={(el) => {
              rings.current[k] = el
            }}
            geometry={ringGeometry}
            material={m}
          />
        ))}
      </group>
      <mesh ref={shadow} geometry={shadowGeometry} material={shadowMaterial} />
      <mesh ref={float} geometry={floatGeometry} material={floatMaterial} visible={false} />
      <primitive object={fishingLine} />
    </>
  )
}

// The rod in the player's hand: a thin pole held out in front, tipped up. It turns with the
// character. Mounted in <Player>'s root.
const ROD_LENGTH = 1.3
const rodGeometry = new CylinderGeometry(0.012, 0.022, ROD_LENGTH, 5).translate(0, ROD_LENGTH / 2, 0)
const rodMaterial = new MeshLambertMaterial({ color: '#c9a36a' })
const reelGeometry = new CylinderGeometry(0.045, 0.045, 0.04, 8).rotateZ(Math.PI / 2).translate(0.04, 0.12, 0)
const reelMaterial = new MeshLambertMaterial({ color: '#5a5f66' })
const HOLD = 0.95 // radians the rod tips forward from upright, carried
const FISHING_HOLD = 0.75 // and while the line is out: held up a little

export function HeldRod() {
  const rod = useFishing((s) => s.rod)
  const turn = useRef<Group>(null)
  const pole = useRef<Group>(null)
  const tip = useRef<Group>(null)

  useFrame(({ clock }) => {
    const g = turn.current
    const p = pole.current
    if (!g || !p || !tip.current) return
    g.rotation.y = playerFacing.heading
    const { phase } = useFishing.getState()
    let tilt = phase === 'idle' ? HOLD : FISHING_HOLD
    if (phase === 'bite') tilt += Math.sin(clock.elapsedTime * 35) * 0.06 // the rod tugs
    if (phase === 'cast') tilt = FISHING_HOLD - Math.sin(Math.PI * Math.min(1, line.t / CAST_TIME)) * 0.5 // flicked forward
    if (phase === 'reel') tilt = FISHING_HOLD - 0.25 + Math.sin(clock.elapsedTime * 30) * 0.03 // held up against the pull
    p.rotation.x = tilt
    p.rotation.z = phase === 'reel' ? -line.needle * 0.45 : 0 // leaning with the fish
    tip.current.getWorldPosition(rodTip)
  })

  if (!rod) return null
  return (
    <group ref={turn}>
      {/* in the right hand (on the left as it faces the camera), at about waist height */}
      <group ref={pole} position={[-0.27, 0.45, 0.12]}>
        <mesh geometry={rodGeometry} material={rodMaterial} />
        <mesh geometry={reelGeometry} material={reelMaterial} />
        <group ref={tip} position-y={ROD_LENGTH} />
      </group>
    </group>
  )
}
