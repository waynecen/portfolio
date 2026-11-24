import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three'
import {
  beat,
  BLOCK_START,
  centreOf,
  I,
  J,
  KEY_CHEST,
  PILLARS,
  PLATE,
  ROOM_OF,
  ROOMS,
  solve,
  takeHeart,
  takeKey,
  takeOar,
  tryDoor,
  useCave,
  type Room,
} from './cave'
import { addCollider, type Collider } from '../core/collision'
import { addHittable } from '../combat/combat'
import { burst } from '../player/puffs'
import { block as box, flat, merge, pick, tint } from '../core/geometry'
import { damage, harm } from '../combat/health'
import { Pearls } from './HiddenPearls'
import { keys, stick } from '../core/input'
import { busy, held, register, say } from '../core/interact'
import { caveRoom, DOOR, ROOM } from '../world/layout'
import { reducedMotion, useSettings } from '../core/settings'
import { pop, thud } from '../core/sfx'
import { playerPos } from '../core/state'
import { useGame } from '../core/store'
import { useSceneFrame } from '../core/sceneFrame'

// The cave behind the waterfall (cave.ts has the rooms and what's been done in them). Each room is
// built like the house's: a floor of stone tiles, tall walls behind and at the sides, a low one in
// front so the camera sees in. Only the room the player is in is drawn, plus the one they just left
// while the camera slides across, the way old top-down adventures flip from screen to screen.

const TALL = 1.6 // back and side walls
const LOW = 0.35 // the front wall
const THICK = 0.5 // each room's own share of the wall between two rooms
const SEAM = 0.03
const SLIDE_SHOW = 0.6 // seconds the room just left stays drawn while the camera slides away

const FLOOR = ['#5d5963', '#56525c', '#625e68'].map((c) => new Color(c))
const C = {
  base: new Color('#2c2930'),
  rock: new Color('#4d4853'),
  rockDark: new Color('#3e3a44'),
  cap: new Color('#67606d'),
  frame: new Color('#5a4a3a'),
}
const H = ROOM.hx
const D = ROOM.hz

type Side = 'n' | 'e' | 's' | 'w'

// A side's wall as boxes, room-local: [x0, x1, z0, z1], leaving a doorway if it has a door.
function wallBoxes(side: Side, door: boolean): [number, number, number, number][] {
  const gap = door ? DOOR : 0
  if (side === 'n' || side === 's') {
    const z0 = side === 'n' ? -D - THICK : D
    const z1 = z0 + THICK
    const x0 = -H - THICK
    const x1 = H + THICK
    return gap ? [[x0, -gap, z0, z1], [gap, x1, z0, z1]] : [[x0, x1, z0, z1]]
  }
  const x0 = side === 'w' ? -H - THICK : H
  const x1 = x0 + THICK
  return gap ? [[x0, x1, -D, -gap], [x0, x1, gap, D]] : [[x0, x1, -D, D]]
}

function buildRoom(r: Room): BufferGeometry {
  const parts: BufferGeometry[] = []
  const seed = r.i * 7 + r.j * 13
  for (let i = -I; i <= I; i++)
    for (let j = -J; j <= J; j++) parts.push(tint(flat(i - 0.5 + SEAM, i + 0.5 - SEAM, j - 0.5 + SEAM, j + 0.5 - SEAM, 0), pick(FLOOR, i, j, seed)))
  parts.push(tint(flat(-H, H, -D, D, -0.005), C.base))
  // Floor through each doorway, out to the neighbour's half (or beyond the mouth, to the light).
  for (const [side, d] of Object.entries(r.doors) as [Side, string][]) {
    const out = d === 'exit' ? 1 : THICK
    const c = pick(FLOOR, side.charCodeAt(0), seed)
    if (side === 'n') parts.push(tint(flat(-DOOR, DOOR, -D - out, -D, 0), c))
    if (side === 's') parts.push(tint(flat(-DOOR, DOOR, D, D + out, 0), c))
    if (side === 'e') parts.push(tint(flat(H, H + out, -DOOR, DOOR, 0), c))
    if (side === 'w') parts.push(tint(flat(-H - out, -H, -DOOR, DOOR, 0), c))
  }
  for (const side of ['n', 'e', 's', 'w'] as Side[]) {
    const height = side === 's' ? LOW : TALL
    for (const [x0, x1, z0, z1] of wallBoxes(side, !!r.doors[side])) {
      parts.push(tint(box(x0, x1, 0, height, z0, z1), side === 'n' ? C.rock : C.rockDark))
      parts.push(tint(box(x0 - 0.03, x1 + 0.03, height, height + 0.06, z0 - 0.03, z1 + 0.03), C.cap))
    }
    // A timber frame round each doorway in a tall wall.
    if (r.doors[side] && side !== 's') {
      const along = side === 'n'
      for (const s of [-1, 1]) {
        if (along) parts.push(tint(box(s * DOOR - 0.08, s * DOOR + 0.08, 0, 1.05, -D - THICK, -D + 0.04), C.frame))
        else {
          const x0 = side === 'w' ? -H - THICK : H - 0.04
          parts.push(tint(box(x0, x0 + THICK + 0.04, 0, 1.05, s * DOOR - 0.08, s * DOOR + 0.08), C.frame))
        }
      }
      if (along) parts.push(tint(box(-DOOR - 0.08, DOOR + 0.08, 1.05, 1.2, -D - THICK, -D + 0.04), C.frame))
      else {
        const x0 = side === 'w' ? -H - THICK : H - 0.04
        parts.push(tint(box(x0, x0 + THICK + 0.04, 1.05, 1.2, -DOOR - 0.08, DOOR + 0.08), C.frame))
      }
    }
  }
  return merge(parts)
}

const shellMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true })
const daylight = new MeshBasicMaterial({ color: '#d8ecf7', transparent: true, opacity: 0.35, depthWrite: false })

/** A room's floor and walls, and its walls' colliders. */
function Shell({ r }: { r: Room }) {
  const geometry = useMemo(() => buildRoom(r), [r])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    const c = centreOf(r)
    const list: Collider[] = []
    for (const side of ['n', 'e', 's', 'w'] as Side[])
      for (const [x0, x1, z0, z1] of wallBoxes(side, !!r.doors[side]))
        list.push({ kind: 'box', x: c.x + (x0 + x1) / 2, z: c.z + (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 })
    // Past the mouth, a backstop, so nobody walks off into the dark before the exit takes them out.
    if (r.doors.s === 'exit') list.push({ kind: 'box', x: c.x, z: c.z + D + 1.25, hx: DOOR, hz: 0.25 })
    const removers = list.map(addCollider)
    return () => removers.forEach((remove) => remove())
  }, [r])
  return (
    <>
      <mesh geometry={geometry} material={shellMaterial} />
      {r.doors.s === 'exit' && <mesh material={daylight} position={[0, 0.01, D + 0.4]} rotation-x={-Math.PI / 2} geometry={doorstepLight} />}
      <Torch x={-3} />
      <Torch x={3} />
    </>
  )
}
const doorstepLight = new PlaneGeometry(2 * DOOR, 1.4)

// Torches on the back wall, flickering. Light-less on purpose: adding lights recompiles every material.
const bracket = new BoxGeometry(0.08, 0.3, 0.12)
const flameGeometry = new ConeGeometry(0.08, 0.22, 6).translate(0, 0.11, 0)
const bracketMaterial = new MeshLambertMaterial({ color: '#3a2f28' })
const flameMaterial = new MeshBasicMaterial({ color: '#ffb347' })
const flames: Mesh[] = []
function Torch({ x }: { x: number }) {
  return (
    <group position={[x, 1.05, -D + 0.08]}>
      <mesh geometry={bracket} material={bracketMaterial} />
      <mesh
        ref={(m) => {
          if (m && !flames.includes(m)) flames.push(m)
        }}
        geometry={flameGeometry}
        material={flameMaterial}
        position-y={0.15}
      />
    </group>
  )
}

// ---- The blocks room: push the block onto the plate ----

const PUSH_TIME = 0.3 // seconds of pushing against the block before it slides
const SLIDE_TIME = 0.28 // seconds for it to slide one tile
const BODY = 0.35 // the player's radius (PILL_RADIUS)

/** The block's state, outside React: its tile, the tile it's sliding from, and how far (-1 = still). */
const blk = { i: BLOCK_START.i, j: BLOCK_START.j, fromI: 0, fromJ: 0, t: -1, push: 0 }
const blockCollider: Collider = { kind: 'box', x: 0, z: 0, hx: 0.47, hz: 0.47 }

const blockGeometry = merge([
  tint(box(-0.47, 0.47, 0, 0.8, -0.47, 0.47), new Color('#8b8394')),
  tint(box(-0.4, 0.4, 0.8, 0.84, -0.4, 0.4), new Color('#a29aab')),
])
const pillarGeometry = merge([
  tint(box(-0.38, 0.38, 0, 1.3, -0.38, 0.38), new Color('#5a5460')),
  tint(box(-0.44, 0.44, 1.3, 1.42, -0.44, 0.44), C.cap),
])

function blockedTile(i: number, j: number) {
  if (Math.abs(i) > I || Math.abs(j) > J) return true
  if (i === -I && j === 0) return true // the doorway: a block there would shut the player in
  if (PILLARS.some((p) => p.i === i && p.j === j)) return true
  return i === KEY_CHEST.i && j === KEY_CHEST.j
}

function Blocks() {
  const r = ROOM_OF.blocks
  const c = centreOf(r)
  const solved = useCave((s) => s.solved)
  const key = useCave((s) => s.key)
  const group = useRef<Group>(null)
  const plate = useRef<Mesh>(null)

  useEffect(() => {
    if (useCave.getState().solved) {
      blk.i = PLATE.i
      blk.j = PLATE.j
    }
    const removers = [addCollider(blockCollider), ...PILLARS.map((p) => addCollider({ kind: 'box', x: c.x + p.i, z: c.z + p.j, hx: 0.4, hz: 0.4 }))]
    return () => removers.forEach((remove) => remove())
  }, [c.x, c.z])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const here = useGame.getState().scene === 'cave' && caveRoom(playerPos.x, playerPos.z).i === r.i && caveRoom(playerPos.x, playerPos.z).j === r.j
    const done = useCave.getState().solved
    // Left the room with the puzzle unsolved: the block slides home, so it can't stay stuck.
    if (!here && !done && blk.t < 0 && (blk.i !== BLOCK_START.i || blk.j !== BLOCK_START.j)) {
      blk.i = BLOCK_START.i
      blk.j = BLOCK_START.j
      blk.push = 0
    }
    let x = blk.i
    let z = blk.j
    if (blk.t >= 0) {
      blk.t = Math.min(1, blk.t + dt / SLIDE_TIME)
      const e = 1 - (1 - blk.t) * (1 - blk.t)
      x = blk.fromI + (blk.i - blk.fromI) * e
      z = blk.fromJ + (blk.j - blk.fromJ) * e
      if (blk.t >= 1) {
        blk.t = -1
        thud()
        if (blk.i === PLATE.i && blk.j === PLATE.j) solve()
      }
    } else if (here && !done && !busy()) {
      // Pushing: holding a direction while pressed against the block's far side, square on.
      const ix = +keys.right - +keys.left + stick.x
      const iz = +keys.back - +keys.forward + stick.z
      let di = 0
      let dj = 0
      if (Math.abs(ix) > Math.abs(iz) && Math.abs(ix) > 0.5) di = Math.sign(ix)
      else if (Math.abs(iz) > 0.5) dj = Math.sign(iz)
      const px = playerPos.x - (c.x + blk.i)
      const pz = playerPos.z - (c.z + blk.j)
      const touching =
        (di !== 0 && Math.abs(pz) < 0.3 && px * di < 0 && Math.abs(px) < 0.47 + BODY + 0.06) ||
        (dj !== 0 && Math.abs(px) < 0.3 && pz * dj < 0 && Math.abs(pz) < 0.47 + BODY + 0.06)
      blk.push = touching ? blk.push + dt : 0
      if (blk.push >= PUSH_TIME) {
        blk.push = 0
        if (!blockedTile(blk.i + di, blk.j + dj)) {
          blk.fromI = blk.i
          blk.fromJ = blk.j
          blk.i += di
          blk.j += dj
          blk.t = 0
        }
      }
    }
    blockCollider.x = c.x + x
    blockCollider.z = c.z + z
    group.current?.position.set(x, 0, z)
    if (plate.current) plate.current.position.y = done ? 0.005 : 0.03
  })

  return (
    <>
      <group ref={group}>
        <mesh geometry={blockGeometry} material={shellMaterial} />
      </group>
      <mesh ref={plate} position={[PLATE.i, 0.03, PLATE.j]}>
        <boxGeometry args={[0.8, 0.05, 0.8]} />
        <meshLambertMaterial color={solved ? '#7fb069' : '#b58a3c'} />
      </mesh>
      {PILLARS.map((p) => (
        <mesh key={`${p.i},${p.j}`} geometry={pillarGeometry} material={shellMaterial} position={[p.i, 0, p.j]} />
      ))}
      {solved && <Chest x={KEY_CHEST.i} z={KEY_CHEST.j} room={r} open={key !== 'none'} onOpen={takeKey} />}
      <Tablet
        room={r}
        x={-1}
        z={-J}
        lines={['Words carved in the stone:', '“Push the stone onto the plate.”', '“Leave the room, and the stone goes home.”']}
      />
    </>
  )
}

// ---- Chests, the locked door, the bars ----

const chestBody = new MeshLambertMaterial({ color: '#8a5a32', flatShading: true })
const chestTrim = new MeshLambertMaterial({ color: '#e0b84a', flatShading: true })

/** A chest at room-local (x, z), opened once. */
function Chest({ x, z, room, open, onOpen, big = false }: { x: number; z: number; room: Room; open: boolean; onOpen: () => void; big?: boolean }) {
  const c = centreOf(room)
  const s = big ? 1.35 : 1
  useEffect(() => addCollider({ kind: 'box', x: c.x + x, z: c.z + z, hx: 0.36 * s, hz: 0.26 * s }), [c.x, c.z, x, z, s])
  useEffect(() => {
    if (open) return
    return register({ x: c.x + x, z: c.z + z + 0.3 * s, range: 1, prompt: 'Open', onInteract: onOpen })
  }, [open, c.x, c.z, x, z, s, onOpen])
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh material={chestBody} position-y={0.17}>
        <boxGeometry args={[0.66, 0.34, 0.46]} />
      </mesh>
      <group position={[0, 0.34, -0.23]} rotation-x={open ? -1.9 : 0}>
        <mesh material={chestBody} position={[0, 0.07, 0.23]}>
          <boxGeometry args={[0.66, 0.14, 0.46]} />
        </mesh>
        <mesh material={chestTrim} position={[0, 0.07, 0.47]}>
          <boxGeometry args={[0.12, 0.1, 0.03]} />
        </mesh>
      </group>
      <mesh material={chestTrim} position-y={0.17}>
        <boxGeometry args={[0.68, 0.06, 0.48]} />
      </mesh>
    </group>
  )
}

/** Something to read, carved in a stone, at room-local (x, z). */
function Tablet({ room, x, z, lines }: { room: Room; x: number; z: number; lines: string[] }) {
  const c = centreOf(room)
  useEffect(() => register({ x: c.x + x, z: c.z + z + 0.3, range: 1.1, prompt: 'Read', onInteract: () => say(lines) }), [c.x, c.z, x, z, lines])
  useEffect(() => addCollider({ kind: 'box', x: c.x + x, z: c.z + z, hx: 0.35, hz: 0.12 }), [c.x, c.z, x, z])
  return (
    <mesh position={[x, 0.35, z]}>
      <boxGeometry args={[0.7, 0.7, 0.16]} />
      <meshLambertMaterial color="#77707f" flatShading />
    </mesh>
  )
}

const barGeometry = new CylinderGeometry(0.035, 0.035, 1.05, 6).translate(0, 0.525, 0)
const barMaterial = new MeshLambertMaterial({ color: '#2f2c33' })

/** Iron bars across a doorway (room-local side), shut while `shut()` says so. */
function Bars({ room, side, shut }: { room: Room; side: 'n' | 's'; shut: () => boolean }) {
  const c = centreOf(room)
  const group = useRef<Group>(null)
  const z = side === 'n' ? -D - THICK / 2 : D + THICK / 2
  const collider = useRef<Collider>({ kind: 'box', x: 1e6, z: c.z + z, hx: DOOR, hz: THICK / 2 })
  useEffect(() => addCollider(collider.current), [])
  useFrame(() => {
    const on = shut()
    collider.current.x = on ? c.x : 1e6
    if (group.current) group.current.visible = on
  })
  return (
    <group ref={group} position={[0, 0, z]}>
      {[-0.36, -0.12, 0.12, 0.36].map((x) => (
        <mesh key={x} geometry={barGeometry} material={barMaterial} position-x={x} />
      ))}
    </group>
  )
}

function LockedDoor() {
  const r = ROOM_OF.mouth
  const c = centreOf(r)
  const key = useCave((s) => s.key)
  const open = key === 'used'
  useEffect(() => {
    if (open) return
    const removeCollider = addCollider({ kind: 'box', x: c.x, z: c.z - D - THICK / 2, hx: DOOR, hz: THICK / 2 })
    const removeFocus = register({ x: c.x, z: c.z - D + 0.4, range: 1, prompt: key === 'held' ? 'Unlock' : 'Look', onInteract: tryDoor })
    return () => {
      removeCollider()
      removeFocus()
    }
  }, [open, key, c.x, c.z])
  if (open) return null
  return (
    <group position={[0, 0, -D - 0.12]}>
      <mesh material={chestBody} position-y={0.52}>
        <boxGeometry args={[2 * DOOR, 1.04, 0.12]} />
      </mesh>
      {[0.25, 0.8].map((y) => (
        <mesh key={y} material={barMaterial} position={[0, y, 0.07]}>
          <boxGeometry args={[2 * DOOR, 0.07, 0.02]} />
        </mesh>
      ))}
      <mesh material={chestTrim} position={[0, 0.52, 0.07]}>
        <boxGeometry args={[0.12, 0.16, 0.03]} />
      </mesh>
    </group>
  )
}

// ---- The boss room: a big slime ----

const BOSS_HP = 6
const BOSS_R = 0.62
const BOSS_HOP = 0.55 // seconds in the air per hop
const BOSS_SPEED = 2.4 // ground speed in a hop
const BOSS_REST = [0.7, 1.2] // seconds sat between hops; shorter once it's hurt
const ANGRY = 0.6 // the rest's share once it's down to half
const BOSS_KNOCK = 4
const BOSS_BUMP = BOSS_R + 0.3

const boss = { x: 0, z: -1.5, hp: BOSS_HP, hopT: -1, rest: 1.2, dirX: 0, dirZ: 1, knockX: 0, knockZ: 0, flash: 0 }
function resetBoss() {
  Object.assign(boss, { x: 0, z: -1.5, hp: BOSS_HP, hopT: -1, rest: 1.2, knockX: 0, knockZ: 0, flash: 0 })
}

const bossBody = new MeshLambertMaterial({ color: '#9b6fd1', flatShading: true })
const BOSS_COLOR = new Color('#9b6fd1')
const WHITE = new Color('#ffffff')
const bossGeometry = new SphereGeometry(BOSS_R, 16, 10).translate(0, BOSS_R, 0)
const eye = new SphereGeometry(0.07, 8, 6)
const eyeMaterial = new MeshLambertMaterial({ color: '#1f1f1f' })
const spike = new ConeGeometry(0.07, 0.18, 4)

const calm = () => useCave.getState().beaten || !useSettings.getState().slimes // no slimes: it's sleeping elsewhere
const inRoom = (r: Room) => {
  if (useGame.getState().scene !== 'cave') return false
  const at = caveRoom(playerPos.x, playerPos.z)
  return at.i === r.i && at.j === r.j
}

function BigSlime() {
  const r = ROOM_OF.boss
  const c = centreOf(r)
  const group = useRef<Group>(null)
  const hittable = useRef({
    x: 1e6,
    z: 0,
    r: BOSS_R,
    hit: (power: number, dx: number, dz: number) => {
      if (calm() || boss.hp <= 0) return
      boss.hp -= power
      boss.flash = 0.15
      boss.knockX = dx * BOSS_KNOCK
      boss.knockZ = dz * BOSS_KNOCK
      boss.hopT = -1
      boss.rest = 0.6
      if (boss.hp <= 0) {
        pop()
        for (let k = 0; k < 3; k++) burst(c.x + boss.x, c.z + boss.z, 10, BOSS_COLOR)
        beat()
      }
    },
  })
  useEffect(() => addHittable(hittable.current), [])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1)
    const g = group.current
    const h = hittable.current
    if (!g) return
    const here = inRoom(r)
    if (!here && boss.hp < BOSS_HP) resetBoss() // left the room: it heals and waits
    g.visible = !calm()
    if (calm()) {
      h.x = 1e6
      return
    }
    if (here && !busy()) {
      const px = playerPos.x - (c.x + boss.x)
      const pz = playerPos.z - (c.z + boss.z)
      if (boss.knockX || boss.knockZ) {
        boss.x += boss.knockX * dt
        boss.z += boss.knockZ * dt
        const ease = Math.exp(-7 * dt)
        boss.knockX *= ease
        boss.knockZ *= ease
        if (Math.abs(boss.knockX) + Math.abs(boss.knockZ) < 0.05) boss.knockX = boss.knockZ = 0
      }
      if (boss.hopT >= 0) {
        boss.hopT += dt
        boss.x += boss.dirX * BOSS_SPEED * dt
        boss.z += boss.dirZ * BOSS_SPEED * dt
        if (boss.hopT >= BOSS_HOP) {
          boss.hopT = -1
          const angry = boss.hp <= BOSS_HP / 2 ? ANGRY : 1
          boss.rest = (BOSS_REST[0] + Math.random() * (BOSS_REST[1] - BOSS_REST[0])) * angry
          thud()
        }
      } else if ((boss.rest -= dt) <= 0) {
        const len = Math.hypot(px, pz) || 1
        boss.dirX = px / len
        boss.dirZ = pz / len
        boss.hopT = 0
      }
      // Stay inside the room.
      boss.x = Math.max(-I + 0.2, Math.min(I - 0.2, boss.x))
      boss.z = Math.max(-J + 0.2, Math.min(J - 0.2, boss.z))
      if (Math.hypot(px, pz) < BOSS_BUMP && harm.invuln <= 0) damage(1, px, pz)
    }
    h.x = c.x + boss.x
    h.z = c.z + boss.z

    const t = boss.hopT >= 0 ? boss.hopT / BOSS_HOP : 0
    const motion = reducedMotion() ? 0.3 : 1
    const lift = Math.sin(Math.PI * t) * 0.45 * motion
    const squash = boss.hopT >= 0 ? 1 + 0.15 * Math.sin(Math.PI * t) * motion : 1 - 0.07 * Math.abs(Math.sin(clock.elapsedTime * 2.5)) * motion
    g.position.set(boss.x, lift, boss.z)
    g.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    g.rotation.y = Math.atan2(boss.dirX, boss.dirZ)
    boss.flash = Math.max(0, boss.flash - dt)
    bossBody.color.copy(boss.flash > 0 ? WHITE : BOSS_COLOR)
  })

  return (
    <group ref={group}>
      <mesh geometry={bossGeometry} material={bossBody} />
      <mesh geometry={eye} material={eyeMaterial} position={[-0.2, 0.78, 0.5]} />
      <mesh geometry={eye} material={eyeMaterial} position={[0.2, 0.78, 0.5]} />
      {/* A crown of little spikes, so it reads as the one in charge. */}
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2
        return <mesh key={k} geometry={spike} material={chestTrim} position={[Math.cos(a) * 0.18, 1.3, Math.sin(a) * 0.18]} />
      })}
    </group>
  )
}

// The heart container the big slime leaves: a heart turning slowly where it fell.
const heartShape = new Shape()
heartShape.moveTo(0, -0.18)
heartShape.bezierCurveTo(-0.05, -0.12, -0.24, -0.02, -0.24, 0.1)
heartShape.bezierCurveTo(-0.24, 0.22, -0.08, 0.26, 0, 0.14)
heartShape.bezierCurveTo(0.08, 0.26, 0.24, 0.22, 0.24, 0.1)
heartShape.bezierCurveTo(0.24, -0.02, 0.05, -0.12, 0, -0.18)
const heartGeometry = new ExtrudeGeometry(heartShape, { depth: 0.08, bevelEnabled: false }).translate(0, 0, -0.04)
const heartMaterial = new MeshLambertMaterial({ color: '#e2262b', emissive: '#e2262b', emissiveIntensity: 0.3 })

function HeartContainer() {
  const r = ROOM_OF.boss
  const c = centreOf(r)
  const beaten = useCave((s) => s.beaten)
  const slimes = useSettings((s) => s.slimes)
  const taken = useCave((s) => s.heart)
  const ready = (beaten || !slimes) && !taken
  const mesh = useRef<Mesh>(null)
  useEffect(() => {
    if (!ready) return
    return register({ x: c.x, z: c.z, range: 1, prompt: 'Pick up', onInteract: takeHeart })
  }, [ready, c.x, c.z])
  useSceneFrame('cave', ({ clock }) => {
    if (!mesh.current || reducedMotion()) return
    mesh.current.rotation.y = clock.elapsedTime * 1.5
    mesh.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.05
  })
  if (!ready) return null
  return <mesh ref={mesh} geometry={heartGeometry} material={heartMaterial} position={[0, 0.5, 0]} />
}

// ---- The hoard: the chest at the end ----

const goldMaterial = new MeshLambertMaterial({ color: '#e8b84a', emissive: '#e8b84a', emissiveIntensity: 0.2, flatShading: true })
function Hoard() {
  const r = ROOM_OF.hoard
  const c = centreOf(r)
  const oar = useCave((s) => s.oar)
  return (
    <>
      {/* The cave's pearl (pearls.ts) is in the world's coordinates; this room's group is offset. */}
      <group position={[-c.x, 0, -c.z]}>
        <Pearls where="cave" />
      </group>
      <Chest x={0} z={-1.5} room={r} big open={oar} onOpen={takeOar} />
      {[
        [-1.3, -2.4, 0.22],
        [1.4, -2.2, 0.16],
        [-3.8, 2.2, 0.12],
      ].map(([x, z, s]) => (
        <mesh key={`${x},${z}`} material={goldMaterial} position={[x, s / 2, z]} rotation-y={x}>
          <coneGeometry args={[s * 2, s, 7]} />
        </mesh>
      ))}
    </>
  )
}

// What goes in each room, room-local.
const CONTENTS: Record<Room['id'], () => ReactNode> = {
  mouth: () => <LockedDoor />,
  blocks: () => <Blocks />,
  boss: () => (
    <>
      <BigSlime />
      <HeartContainer />
      <Bars room={ROOM_OF.boss} side="n" shut={() => !calm()} />
      {/* Shut behind the player once they're in, until the big slime is beaten. */}
      <Bars room={ROOM_OF.boss} side="s" shut={() => !calm() && inRoom(ROOM_OF.boss) && playerPos.z < centreOf(ROOM_OF.boss).z + D - 1.2} />
    </>
  ),
  hoard: () => <Hoard />,
}

/** The whole cave. Drawn only while the player is in it; see Game.tsx. */
export function Cave() {
  const groups = useRef<(Group | null)[]>([])
  const view = useRef({ now: -1, last: -1, until: 0 })
  useSceneFrame('cave', ({ clock }) => {
    // Which room is on screen, and the one just left while the camera slides across.
    const at = caveRoom(playerPos.x, playerPos.z)
    const now = ROOMS.findIndex((r) => r.i === at.i && r.j === at.j)
    const v = view.current
    if (now !== v.now) {
      v.last = v.now
      v.now = now
      v.until = clock.elapsedTime + SLIDE_SHOW
    }
    for (let k = 0; k < ROOMS.length; k++) {
      const g = groups.current[k]
      if (g) g.visible = k === v.now || (k === v.last && clock.elapsedTime < v.until)
    }
    // Torches flicker.
    if (!reducedMotion() && !held()) {
      const t = clock.elapsedTime
      for (let k = 0; k < flames.length; k++) flames[k].scale.set(1, 0.85 + 0.25 * Math.abs(Math.sin(t * 9 + k * 1.7) * Math.sin(t * 5.3 + k)), 1)
    }
  })
  return (
    <>
      {ROOMS.map((r, k) => {
        const c = centreOf(r)
        return (
          <group
            key={r.id}
            ref={(el) => {
              groups.current[k] = el
            }}
            position={[c.x, 0, c.z]}
          >
            <Shell r={r} />
            {CONTENTS[r.id]()}
          </group>
        )
      })}
    </>
  )
}
