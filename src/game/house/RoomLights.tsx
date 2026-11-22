import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { CylinderGeometry, MeshLambertMaterial, type PointLight } from 'three'
import { useEdit } from './edit'
import { PIECE, useOwned, useRoom } from './room'
import { useGame } from '../core/store'
import { INTERIOR } from '../world/layout'
import { sky } from '../world/sky'

// The room's own lights, for a softer, cosier room than the shared daylight alone (Atmosphere.tsx):
// a paper lantern hanging from the ceiling, and the paper lamp from Pip's shop once it's bought.
// Both glow brighter as night falls, when they're most of the light.
//
// The lights themselves (RoomLights) are mounted outside the house's group, which is hidden outdoors:
// a hidden light drops out of the light count, and a change in that count recompiles every material
// on each trip through the door. So they're always there, and simply at 0 away from the house.

const PENDANT = { x: 0, y: 2.25, z: 0.3 } // the hanging lantern, house-local; the cord runs up out of sight
const CEILING = { day: 2, night: 8, distance: 10 } // its light, candela; it pools under the lantern and fades to the walls
const LAMP = { day: 0.5, night: 1.8, distance: 3.5, y: 1.1 } // the paper lamp's light, at the height of its shade
const WARM = '#ffc98a'
const GLOW = { day: 0.35, night: 1 } // how much the paper shades glow (emissive)

/** The paper of both shades: lit from inside, more at night. Shared, and set once a frame here. */
export const shadeMaterial = new MeshLambertMaterial({ color: '#fff3dc', emissive: WARM, emissiveIntensity: GLOW.day })

const lantern = new CylinderGeometry(0.26, 0.3, 0.42, 12)
const cap = new CylinderGeometry(0.1, 0.12, 0.05, 10)
const cord = new CylinderGeometry(0.012, 0.012, 3, 4)
const dark = new MeshLambertMaterial({ color: '#3a2a20' })

const mix = (a: number, b: number) => a + (b - a) * sky.weather.night

/** The ceiling lantern; mount in the house's group (Game.tsx). */
export function Pendant() {
  return (
    <group position={[INTERIOR.x + PENDANT.x, PENDANT.y, INTERIOR.z + PENDANT.z]}>
      <mesh geometry={lantern} material={shadeMaterial} />
      <mesh geometry={cap} material={dark} position-y={0.23} />
      <mesh geometry={cord} material={dark} position-y={0.23 + 1.5} />
    </group>
  )
}

/** The room's lights, in world space; mount where they're never hidden (Game.tsx, beside Atmosphere). */
export function RoomLights() {
  const ceiling = useRef<PointLight>(null)
  const lamp = useRef<PointLight>(null)

  useFrame(() => {
    const c = ceiling.current
    const l = lamp.current
    if (!c || !l) return
    const home = useGame.getState().scene === 'house'
    shadeMaterial.emissiveIntensity = mix(GLOW.day, GLOW.night)
    c.intensity = home ? mix(CEILING.day, CEILING.night) : 0
    // The lamp's light follows it round the room, into the hand too while it's being moved.
    const owned = useOwned.getState().owned.includes('lamp')
    l.intensity = home && owned ? mix(LAMP.day, LAMP.night) : 0
    if (owned) {
      const h = useEdit.getState().held
      const at = h && h.id === 'lamp' && useGame.getState().editing ? h.at : useRoom.getState().spots.lamp
      const p = PIECE.lamp
      l.position.set(INTERIOR.x + at.i + (p.w - 1) / 2, LAMP.y, INTERIOR.z + at.j + (p.d - 1) / 2)
    }
  })

  return (
    <>
      <pointLight ref={ceiling} color={WARM} intensity={0} distance={CEILING.distance} decay={2} position={[INTERIOR.x + PENDANT.x, PENDANT.y - 0.15, INTERIOR.z + PENDANT.z]} />
      <pointLight ref={lamp} color={WARM} intensity={0} distance={LAMP.distance} decay={2} />
    </>
  )
}
