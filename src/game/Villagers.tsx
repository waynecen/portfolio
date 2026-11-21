import { track } from '../analytics'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { CapsuleGeometry, ConeGeometry, MeshLambertMaterial, SphereGeometry, type Group } from 'three'
import { addCollider, type Collider } from './collision'
import { useFishing } from './fishing'
import { busy, openPanel, register, say, type Interactable } from './interact'
import { OUTSIDE_SPAWN, SHOP_AT } from './layout'
import { roadTiles } from './pois'
import { projects, stationPos } from './projects'
import { autumn, spring, winter } from './season'
import { reducedMotion } from './settings'
import { sky } from './sky'
import { playerPos } from './state'
import { useGame } from './store'

// The neighbours: three original animals who live on the island.
// - Bramble, a frog, waits by the house and gives the guided tour: talk to Bramble and follow along
//   the roads to every project in turn; at each one Bramble introduces it. Wander off and the tour
//   waits; go far enough for long enough and it's called off, to be picked up another time.
// - Mochi, a rabbit, strolls the roads near the house and chats: what Mochi says changes with the
//   weather, the hour, the season and what you're holding, with a real tip tucked in.
// - Pip, a hedgehog, keeps the shop at the stall east of the house (shop.ts, ShopPanel.tsx).
// They walk on the roads only, finding their way with a breadth-first search over the road tiles.

const WALK = 1.2 // Mochi's walking speed (units/s)
const GUIDE_WALK = 1.5 // Bramble's, on the tour: a little slower than the player walks
const WANDER = 9 // Mochi strolls to road tiles within this many tiles of the house
const PAUSE = [2, 5] // seconds Mochi stands between strolls
const RANGE = 1.4 // how close to talk
const CATCH_UP = 2.6 // on the tour, how close the player must come before Bramble introduces a project
const LOST = 14 // on the tour, this far away...
const LOST_FOR = 10 // ...for this many seconds, and the tour is called off

type Tile = { i: number; j: number }
const key = (t: Tile) => `${t.i},${t.j}`
const roads = new Map(roadTiles.map((t) => [key(t), t]))

/** The road tile nearest (x, z). */
function nearestRoad(x: number, z: number): Tile {
  let best = roadTiles[0]
  let bestD = Infinity
  for (const t of roadTiles) {
    const d = (t.i - x) ** 2 + (t.j - z) ** 2
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

/** The shortest way along the roads from one road tile to another (both included), or just the start. */
function route(from: Tile, to: Tile): Tile[] {
  const prev = new Map<string, Tile | null>([[key(from), null]])
  const queue = [from]
  while (queue.length) {
    const t = queue.shift()!
    if (t.i === to.i && t.j === to.j) break
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = roads.get(key({ i: t.i + di, j: t.j + dj }))
      if (n && !prev.has(key(n))) {
        prev.set(key(n), t)
        queue.push(n)
      }
    }
  }
  if (!prev.has(key(to))) return [from]
  const path: Tile[] = []
  for (let t: Tile | null = to; t; t = prev.get(key(t)) ?? null) path.unshift(t)
  return path
}

// The tour's stops: the road tile beside each project's station, in the order of the HTML page.
const STOPS = stationPos.map((p, k) => ({ at: nearestRoad(p.x, p.z), station: p, project: projects[k] }))

type Kind = 'frog' | 'rabbit' | 'hedgehog'
type Villager = {
  name: string
  kind: Kind
  x: number
  z: number
  heading: number
  path: Tile[]
  step: number
  wait: number
  home: Tile
  talking: boolean
  item: Interactable
  collider: Collider & { kind: 'circle' }
}

function villager(name: string, kind: Kind, home: Tile, prompt: string, onInteract: () => void): Villager {
  return {
    name,
    kind,
    x: home.i,
    z: home.j,
    heading: 0,
    path: [],
    step: 0,
    wait: 1 + Math.random() * 3,
    home,
    talking: false,
    item: { x: home.i, z: home.j, range: RANGE, prompt, onInteract },
    collider: { kind: 'circle', x: home.i, z: home.j, r: 0.28 },
  }
}

// The tour, outside React: where it's up to and what it's doing.
const tour = { on: false, pending: false, stop: 0, phase: 'walk' as 'walk' | 'wait' | 'talk' | 'home', lostFor: 0, cancelled: false }

const bramble = villager('Bramble', 'frog', nearestRoad(1, 1), 'Talk', () => {
  if (tour.on) {
    say(['Keep up! The next one is just along here.'])
    return
  }
  const first = tour.cancelled ? 'We lost each other last time! Shall we try again?' : 'Hello! I’m Bramble. I know every corner of this island.'
  tour.cancelled = false
  say([first, `There are ${STOPS.length} projects to see. I’ll walk you round them all. Follow me!`])
  tour.pending = true // starts once the dialogue closes
})

const mochiLines = (() => {
  let turn = 0
  const DEFAULTS = [
    ['Have you met Pip? Pip keeps the shop east of the house.', 'Hats! Pip sells hats. Shells buy them.'],
    ['Bramble knows every project on the island.', 'Ask for the tour. Bramble loves giving the tour.'],
    ['I found shells in the tall grass yesterday.', 'Give it a swing with your sword. Gently.'],
    ['Lost? The wind can show you the way.', 'Where to?, it’s called. Very useful.'],
  ]
  return () => {
    if (useFishing.getState().rod) return ['Ooh, going fishing?', 'When something bites, hold left and right to keep the needle in the green.']
    if (!winter && sky.weather.rain > 0.5) return ['I love the rain. The puddles are the best part.', 'Fish don’t mind it either. The dock’s off to the south-west.']
    if (sky.weather.night > 0.5) return ['Can’t sleep either?', 'The fireflies are out. You can catch them, you know: walk up slowly.']
    if (winter && turn % 2 === 0) return ['Brr! Snow on everything.', 'The pumpkins come back in autumn. Well, at Halloween.']
    if (spring && turn % 2 === 0) return ['The trees are in blossom!', 'The pink ones only last a few weeks. Butterflies love them.']
    if (autumn && turn % 2 === 0) return ['Crunchy leaves everywhere. Best season.', 'Walk through the piles. It’s very satisfying.']
    return DEFAULTS[turn++ % DEFAULTS.length]
  }
})()

const mochi = villager('Mochi', 'rabbit', nearestRoad(-3, 1), 'Talk', () => say(mochiLines()))
const pip = villager('Pip', 'hedgehog', { i: SHOP_AT.x, j: SHOP_AT.z - 0.55 }, 'Shop', () => {
  if (!busy()) openPanel('shop')
})
// Pip stays behind the stall: the stall is what you talk to.
pip.item.x = SHOP_AT.x
pip.item.z = SHOP_AT.z
pip.item.range = 1.6
pip.collider.r = 0

const VILLAGERS = [bramble, mochi, pip]

function walkTo(v: Villager, to: Tile) {
  v.path = route(nearestRoad(v.x, v.z), to)
  v.step = 0
}

/** Moves v along its path by `speed`; true once it's at the end. */
function walk(v: Villager, speed: number, dt: number): boolean {
  if (v.step >= v.path.length) return true
  const t = v.path[v.step]
  const dx = t.i - v.x
  const dz = t.j - v.z
  const d = Math.sqrt(dx * dx + dz * dz)
  const move = speed * dt
  if (d <= move) {
    v.x = t.i
    v.z = t.j
    v.step++
  } else {
    v.x += (dx / d) * move
    v.z += (dz / d) * move
    v.heading = Math.atan2(dx, dz)
  }
  return v.step >= v.path.length
}

function face(v: Villager, x: number, z: number) {
  v.heading = Math.atan2(x - v.x, z - v.z)
}

function updateTour(dt: number) {
  const dialogue = useGame.getState().dialogue
  if (tour.pending && !dialogue) {
    tour.pending = false
    tour.on = true
    tour.stop = 0
    tour.phase = 'walk'
    tour.lostFor = 0
    walkTo(bramble, STOPS[0].at)
  }
  if (!tour.on) return
  const toPlayer = Math.hypot(playerPos.x - bramble.x, playerPos.z - bramble.z)
  // Left behind for long enough: call it off and head home.
  tour.lostFor = toPlayer > LOST ? tour.lostFor + dt : 0
  if (tour.lostFor > LOST_FOR && tour.phase !== 'home') {
    tour.on = false
    tour.cancelled = true
    walkTo(bramble, bramble.home)
    return
  }
  const stop = STOPS[tour.stop]
  if (tour.phase === 'walk') {
    // Walk on while the player keeps up; wait for them if they fall more than a few tiles behind.
    if (toPlayer < 5 && walk(bramble, GUIDE_WALK, dt)) tour.phase = 'wait'
  } else if (tour.phase === 'wait') {
    face(bramble, stop.station.x, stop.station.z)
    if (toPlayer < CATCH_UP && !dialogue && !busy()) {
      const last = tour.stop === STOPS.length - 1
      say([
        `This is ${stop.project.title}.`,
        ...(stop.project.description ? [stop.project.description] : []),
        last ? 'That’s every project! Thanks for coming round. Find me by the house if you’d like to go again.' : 'Walk up to the pillar to open it. Then on to the next one!',
      ])
      tour.phase = 'talk'
    }
  } else if (tour.phase === 'talk') {
    if (!dialogue) {
      if (tour.stop === STOPS.length - 1) {
        tour.phase = 'home'
        track('Tour finished')
        walkTo(bramble, bramble.home)
      } else {
        tour.stop++
        tour.phase = 'walk'
        walkTo(bramble, STOPS[tour.stop].at)
      }
    }
  } else if (walk(bramble, WALK, dt)) tour.on = false // home again
}

// A stroll for Mochi (and Bramble, idling near home): to a random road tile not too far away.
// Never the step right outside the front door, so nobody stands in the way in or out.
function stroll(v: Villager, near: Tile, radius: number) {
  const options = roadTiles.filter(
    (t) => Math.hypot(t.i - near.i, t.j - near.j) <= radius && Math.hypot(t.i - OUTSIDE_SPAWN.x, t.j - OUTSIDE_SPAWN.z) > 1.2,
  )
  walkTo(v, options[Math.floor(Math.random() * options.length)])
}

// Shapes, shared.
const bodyGeometry = new CapsuleGeometry(0.2, 0.22, 4, 10).translate(0, 0.33, 0)
const headGeometry = new SphereGeometry(0.21, 14, 10).translate(0, 0.78, 0)
const eyeGeometry = new SphereGeometry(0.03, 6, 4)
const black = new MeshLambertMaterial({ color: '#1f1f1f' })
const COLORS: Record<Kind, { body: string; head: string; extra: string }> = {
  frog: { body: '#6fae5a', head: '#7cbf66', extra: '#f0ead6' },
  rabbit: { body: '#efe3cf', head: '#f4ead8', extra: '#e8a9a9' },
  hedgehog: { body: '#8a5a3b', head: '#e3c9a5', extra: '#5c3b26' },
}
const MATERIALS = Object.fromEntries(
  Object.entries(COLORS).map(([k, c]) => [
    k,
    { body: new MeshLambertMaterial({ color: c.body, flatShading: true }), head: new MeshLambertMaterial({ color: c.head, flatShading: true }), extra: new MeshLambertMaterial({ color: c.extra, flatShading: true }) },
  ]),
) as Record<Kind, { body: MeshLambertMaterial; head: MeshLambertMaterial; extra: MeshLambertMaterial }>
const earGeometry = new CapsuleGeometry(0.05, 0.28, 3, 6)
const bumpGeometry = new SphereGeometry(0.08, 8, 6)
const spikeGeometry = new ConeGeometry(0.06, 0.16, 5)

function Body({ kind }: { kind: Kind }) {
  const m = MATERIALS[kind]
  return (
    <>
      <mesh geometry={bodyGeometry} material={m.body} />
      <mesh geometry={headGeometry} material={m.head} scale={kind === 'frog' ? [1.25, 0.85, 1] : 1} />
      <mesh geometry={eyeGeometry} material={black} position={[-0.08, kind === 'frog' ? 0.96 : 0.82, kind === 'frog' ? 0.1 : 0.19]} />
      <mesh geometry={eyeGeometry} material={black} position={[0.08, kind === 'frog' ? 0.96 : 0.82, kind === 'frog' ? 0.1 : 0.19]} />
      {kind === 'frog' && (
        <>
          <mesh geometry={bumpGeometry} material={m.head} position={[-0.09, 0.9, 0.06]} />
          <mesh geometry={bumpGeometry} material={m.head} position={[0.09, 0.9, 0.06]} />
          <mesh geometry={bodyGeometry} material={m.extra} scale={[0.75, 0.6, 0.5]} position={[0, 0.1, 0.06]} />
        </>
      )}
      {kind === 'rabbit' && (
        <>
          <mesh geometry={earGeometry} material={m.head} position={[-0.08, 1.12, -0.02]} rotation-z={0.12} />
          <mesh geometry={earGeometry} material={m.head} position={[0.08, 1.12, -0.02]} rotation-z={-0.12} />
        </>
      )}
      {kind === 'hedgehog' &&
        [-0.5, -0.17, 0.17, 0.5].flatMap((a) =>
          [0.45, 0.7].map((y) => (
            <mesh key={`${a},${y}`} geometry={spikeGeometry} material={m.extra} position={[Math.sin(a) * 0.17, y, -Math.cos(a) * 0.17]} rotation-x={-1.1} />
          )),
        )}
    </>
  )
}

/** Pip's market stall: a counter under a striped awning on two posts. */
function Stall() {
  useEffect(() => addCollider({ kind: 'box', x: SHOP_AT.x, z: SHOP_AT.z, hx: 0.8, hz: 0.25 }), [])
  return (
    <group position={[SHOP_AT.x, 0, SHOP_AT.z]}>
      <mesh position-y={0.4}>
        <boxGeometry args={[1.6, 0.8, 0.5]} />
        <meshLambertMaterial color="#a0724a" />
      </mesh>
      <mesh position-y={0.82}>
        <boxGeometry args={[1.7, 0.05, 0.6]} />
        <meshLambertMaterial color="#c99a68" />
      </mesh>
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} position={[x, 0.95, -0.25]}>
          <boxGeometry args={[0.07, 1.9, 0.07]} />
          <meshLambertMaterial color="#8a5a3b" />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[-0.68 + k * 0.34, 1.85, -0.05]} rotation-x={0.35}>
          <boxGeometry args={[0.34, 0.04, 0.7]} />
          <meshLambertMaterial color={k % 2 ? '#f4efe2' : '#d9624a'} />
        </mesh>
      ))}
      {/* a few hats on the counter, for show */}
      <mesh position={[-0.45, 0.92, 0.05]}>
        <coneGeometry args={[0.08, 0.2, 10]} />
        <meshLambertMaterial color="#e0566a" />
      </mesh>
      <mesh position={[0.4, 0.86, 0.05]}>
        <cylinderGeometry args={[0.16, 0.16, 0.03, 12]} />
        <meshLambertMaterial color="#e3c27a" />
      </mesh>
    </group>
  )
}

export function Villagers() {
  const groups = useRef<(Group | null)[]>([])

  useEffect(() => {
    const removers: (() => void)[] = []
    for (const v of VILLAGERS) {
      const talk = v.item.onInteract
      v.item.onInteract = () => {
        v.talking = true
        face(v, playerPos.x, playerPos.z)
        talk()
      }
      removers.push(register(v.item))
      if (v.collider.r > 0) removers.push(addCollider(v.collider))
    }
    return () => removers.forEach((r) => r())
  }, [])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1)
    const s = useGame.getState()
    const paused = s.scene !== 'world' || s.panel !== null || s.fading
    if (!paused) {
      updateTour(dt)
      for (const v of VILLAGERS) {
        // Stand and chat until the dialogue closes.
        if (v.talking) {
          if (!s.dialogue) v.talking = false
          continue
        }
        if (v === pip || (v === bramble && tour.on)) continue
        if (walk(v, WALK, dt)) {
          v.wait -= dt
          if (v.wait <= 0) {
            v.wait = PAUSE[0] + Math.random() * (PAUSE[1] - PAUSE[0])
            if (v === mochi) stroll(v, { i: 0, j: 0 }, WANDER)
            else stroll(v, v.home, 2)
          }
        }
      }
    }
    for (let k = 0; k < VILLAGERS.length; k++) {
      const v = VILLAGERS[k]
      const g = groups.current[k]
      if (v !== pip) {
        v.item.x = v.collider.x = v.x
        v.item.z = v.collider.z = v.z
      }
      if (!g) continue
      const moving = v.step < v.path.length && !v.talking && !paused
      g.position.set(v.x, moving && !reducedMotion() ? Math.abs(Math.sin(clock.elapsedTime * 9 + k)) * 0.05 : 0, v.z)
      g.rotation.y = v === pip ? 0 : v.heading
    }
  })

  return (
    <>
      <Stall />
      {VILLAGERS.map((v, k) => (
        <group
          key={v.name}
          ref={(el) => {
            groups.current[k] = el
          }}
        >
          <Body kind={v.kind} />
        </group>
      ))}
    </>
  )
}
