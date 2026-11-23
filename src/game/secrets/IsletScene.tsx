import { useEffect, useRef } from 'react'
import { BoxGeometry, Color, CylinderGeometry, MeshLambertMaterial, type BufferGeometry, type Group } from 'three'
import { useCave } from './cave'
import { addCollider } from '../core/collision'
import { DOCK } from '../life/fishing'
import { block, merge, tint, unindexed } from '../core/geometry'
import { register } from '../core/interact'
import { WATER_Y } from '../world/Island'
import { ISLET_BOAT } from '../world/layout'
import { CHEST_AT, DOCK_BOAT, openChest, readSign, rowBack, rowOut, SIGN_AT, useIslet } from './islet'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'

// The two rowing boats (one tied to the dock, one off the islet's shore) and what stands on the
// islet: a carved sign and an old sea chest (islet.ts has the rules). Its trees are drawn with the
// island's (Trees.tsx) and its pearl with the others (HiddenPearls.tsx).

const BOB = 0.025 // how far the boats rise and fall on the swell
const HULL = new Color('#b0643f')
const HULL_DARK = new Color('#7c4429')
const INSIDE = new Color('#d8b483')
const OAR = new Color('#c9a36a')

// A boat, long along x: a floor, sides and ends, a bench across the middle.
function buildBoat(): BufferGeometry {
  const L = 0.78 // half-length
  const W = 0.32 // half-width
  const parts = [
    tint(block(-L + 0.1, L - 0.1, -0.12, -0.04, -W + 0.05, W - 0.05), HULL_DARK),
    tint(block(-L, L, -0.12, 0.2, -W, -W + 0.06), HULL),
    tint(block(-L, L, -0.12, 0.2, W - 0.06, W), HULL),
    tint(block(-L, -L + 0.06, -0.12, 0.2, -W, W), HULL),
    tint(block(L - 0.06, L, -0.12, 0.2, -W, W), HULL),
    tint(block(-L + 0.06, L - 0.06, -0.06, -0.04, -W + 0.06, W - 0.06), INSIDE),
    tint(block(-0.14, 0.14, 0.06, 0.1, -W + 0.06, W - 0.06), INSIDE),
  ]
  return merge(parts.map(unindexed))
}
const boatGeometry = buildBoat()
const wood = new MeshLambertMaterial({ vertexColors: true, flatShading: true })
// An oar lying in the boat, along its length.
const oarGeometry = merge([
  tint(unindexed(new CylinderGeometry(0.022, 0.022, 1.1, 5).rotateZ(Math.PI / 2)), OAR),
  tint(unindexed(new BoxGeometry(0.26, 0.02, 0.1).translate(0.6, 0, 0)), OAR),
])

function Boat({ x, z, turn, oars, prompt, from, onUse }: { x: number; z: number; turn: number; oars: number; prompt: string; from: { x: number; z: number }; onUse: () => void }) {
  const g = useRef<Group>(null)
  useEffect(() => register({ x: from.x, z: from.z, range: 0.9, prompt, onInteract: onUse }), [from.x, from.z, prompt, onUse])
  useSceneFrame('world', ({ clock }) => {
    if (!g.current || reducedMotion()) return
    const t = clock.elapsedTime + x
    g.current.position.y = Math.sin(t * 1.4) * BOB // the outer group already sits at the water line
    g.current.rotation.x = Math.sin(t * 1.1) * 0.03
  })
  return (
    <group position={[x, WATER_Y + 0.08, z]} rotation-y={turn}>
      <group ref={g} position-y={0}>
        <mesh geometry={boatGeometry} material={wood} />
        {Array.from({ length: oars }, (_, k) => (
          <mesh key={k} geometry={oarGeometry} material={wood} position={[0.05 * (k ? -1 : 1), 0.0, (k ? -1 : 1) * 0.15]} rotation-y={k ? Math.PI : 0} />
        ))}
      </group>
    </group>
  )
}

const chestBody = new MeshLambertMaterial({ color: '#8a5a36', flatShading: true })
const chestTrim = new MeshLambertMaterial({ color: '#c9a648', flatShading: true })

function SeaChest() {
  const open = useIslet((s) => s.chest)
  useEffect(() => addCollider({ kind: 'box', x: CHEST_AT.x, z: CHEST_AT.z, hx: 0.36, hz: 0.26 }), [])
  useEffect(() => (open ? undefined : register({ x: CHEST_AT.x, z: CHEST_AT.z + 0.3, range: 1, prompt: 'Open', onInteract: openChest })), [open])
  return (
    <group position={[CHEST_AT.x, 0, CHEST_AT.z]} rotation-y={-0.2}>
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

const postMaterial = new MeshLambertMaterial({ color: '#8a5f3c', flatShading: true })
const boardMaterial = new MeshLambertMaterial({ color: '#d4a874', flatShading: true })

function CarvedSign() {
  useEffect(() => register({ x: SIGN_AT.x, z: SIGN_AT.z, range: 1.1, prompt: 'Read', onInteract: readSign }), [])
  useEffect(() => addCollider({ kind: 'circle', x: SIGN_AT.x, z: SIGN_AT.z, r: 0.14 }), [])
  return (
    <group position={[SIGN_AT.x, 0, SIGN_AT.z]} rotation-y={0.15}>
      <mesh material={postMaterial} position-y={0.4}>
        <cylinderGeometry args={[0.05, 0.06, 0.8, 6]} />
      </mesh>
      <mesh material={boardMaterial} position-y={0.72}>
        <boxGeometry args={[0.6, 0.34, 0.06]} />
      </mesh>
    </group>
  )
}

export function Islet() {
  const oar = useCave((s) => s.oar)
  return (
    <>
      <Boat
        x={DOCK_BOAT.x}
        z={DOCK_BOAT.z}
        turn={Math.PI / 2}
        oars={oar ? 2 : 1}
        prompt={oar ? 'Row out' : 'Look'}
        from={{ x: DOCK.x + 0.3, z: DOCK_BOAT.z }}
        onUse={rowOut}
      />
      <Boat x={ISLET_BOAT.x} z={ISLET_BOAT.z} turn={0} oars={2} prompt="Row back" from={ISLET_FROM} onUse={rowBack} />
      <SeaChest />
      <CarvedSign />
    </>
  )
}
const ISLET_FROM = { x: ISLET_BOAT.x, z: ISLET_BOAT.z + 0.95 }
