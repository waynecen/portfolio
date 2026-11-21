import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  MeshLambertMaterial,
  OctahedronGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Group,
} from 'three'
import { tileAt } from './grid'
import { register } from './interact'
import { collect, ITEMS, useInventory, type Item, type ItemId } from './inventory'
import { isInland } from './Island'
import { HOUSE } from './layout'
import { built, pois, roadTiles } from './pois'
import { trees } from './Trees'
import { reducedMotion } from './settings'

// The items still waiting to be found, floating and turning slowly over the grass so they catch
// the eye. Walking up gives the "Pick up" prompt; picking one up puts it in the bag (inventory.ts).

const RANGE = 1.1
const SIZE = 1.5 // scale on the shapes below, so they show from across the island
const FLOAT = 0.45 // height above the ground
const BOB = 0.06
const SPIN = 1.2 // radians per second
const GLOW = 0.3 // share of its colour each item gives off, so it still shows at night

// Tiles an item mustn't sit on: roads, places and their neighbours, the house, and the tiles
// round a tree, reaching further behind it (north), since the camera looks north and a canopy
// would hide anything up to a few tiles back. Off the shore's edge too.
const key = (i: number, j: number) => `${i},${j}`
const blocked = new Set<string>()
const around = (i: number, j: number, behind = 1) => {
  for (let di = -1; di <= 1; di++) for (let dj = -behind; dj <= 1; dj++) blocked.add(key(i + di, j + dj))
}
const SHADE = 3 // tiles behind a tree it can hide
for (const t of roadTiles) blocked.add(key(t.i, t.j))
for (const p of pois) {
  const t = tileAt(p.x, p.z)
  around(t.i, t.j)
}
for (let i = HOUSE.i0; i <= HOUSE.i1; i++) for (let j = HOUSE.j0; j <= HOUSE.j1; j++) around(i, j)
for (const t of trees) {
  const { i, j } = tileAt(t.x, t.z)
  around(i, j, SHADE)
}
const free = (i: number, j: number) => !blocked.has(key(i, j)) && !built(i, j) && isInland(i, j, 1)

/** The clear tile nearest `at`, searching outward ring by ring. */
function settle(at: Item['at']) {
  for (let r = 0; r < 12; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        if (free(at.i + di, at.j + dj)) return { x: at.i + di, z: at.j + dj }
      }
  return { x: at.i, z: at.j }
}
const spots = Object.fromEntries(ITEMS.map((t) => [t.id, settle(t.at)])) as Record<ItemId, { x: number; z: number }>

// Each item's shape, about a third of a tile across, centred on its middle.
const SHAPES: Record<ItemId, () => BufferGeometry[]> = {
  shell: () => [new ConeGeometry(0.16, 0.3, 9).rotateZ(Math.PI / 2.4)],
  seaGlass: () => [new OctahedronGeometry(0.15, 0).scale(1, 1.3, 0.7)],
  pineCone: () => [new DodecahedronGeometry(0.13, 0).scale(1, 1.45, 1)],
  coin: () => [new CylinderGeometry(0.15, 0.15, 0.04, 14).rotateX(Math.PI / 2)],
  feather: () => [new BoxGeometry(0.1, 0.36, 0.02).rotateZ(-0.5), new BoxGeometry(0.015, 0.44, 0.025).rotateZ(-0.5)],
  key: () => [
    new TorusGeometry(0.07, 0.025, 6, 12).translate(0, 0.12, 0),
    new BoxGeometry(0.04, 0.24, 0.03).translate(0, -0.06, 0),
    new BoxGeometry(0.07, 0.035, 0.03).translate(0.035, -0.15, 0),
  ],
}

function Pickup({ item }: { item: Item }) {
  const group = useRef<Group>(null)
  const { x, z } = spots[item.id]
  const shape = useMemo(() => {
    const material = new MeshLambertMaterial({ color: item.color, emissive: item.color, emissiveIntensity: GLOW, flatShading: true })
    return SHAPES[item.id]().map((geometry) => ({ geometry, material }))
  }, [item])
  useEffect(() => () => shape.forEach((s) => (s.geometry.dispose(), s.material.dispose())), [shape])

  useEffect(() => register({ x, z, range: RANGE, prompt: 'Pick up', onInteract: () => collect(item.id) }), [x, z, item])

  const phase = x * 1.7 + z // so they don't all bob in step
  useFrame(({ clock }) => {
    const g = group.current
    if (!g || reducedMotion()) return
    const t = clock.elapsedTime + phase
    g.rotation.y = t * SPIN
    g.position.y = FLOAT + Math.sin(t * 2) * BOB
  })

  return (
    <group ref={group} position={[x, FLOAT, z]} scale={SIZE}>
      {shape.map((s, k) => (
        <mesh key={k} geometry={s.geometry} material={s.material} />
      ))}
    </group>
  )
}

/** Every item not yet in the bag, where it waits on the island. */
export function Pickups() {
  const found = useInventory((s) => s.found)
  return (
    <>
      {ITEMS.filter((t) => !found.includes(t.id)).map((t) => (
        <Pickup key={t.id} item={t} />
      ))}
    </>
  )
}
