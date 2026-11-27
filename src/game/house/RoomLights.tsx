import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { CylinderGeometry, MeshLambertMaterial, type Group, type PointLight } from 'three'
import { useEdit } from './edit'
import { PIECE, useOwned, useRoom } from './room'
import { useGame } from '../core/store'
import { INTERIOR } from '../world/layout'
import { reducedMotion } from '../core/settings'
import { detectTier } from '../core/quality'
import { useSceneFrame } from '../core/sceneFrame'
import { sky } from '../world/sky'
import { GLOW, shadeMaterial, useLightSwitch, WARM } from './lights'

// The room's own lights, for a softer, cosier room than the shared daylight alone (Atmosphere.tsx):
// a paper lantern hanging from the ceiling, the fire, and the paper lamp from Pip's shop once it's bought.
// Both glow brighter as night falls, when they're most of the light. The switch by the door
// (LightSwitch.tsx) turns the lantern off and on; the lamp stays as it is.
//
// The lights themselves (RoomLights) are mounted outside the house's group, which is hidden outdoors:
// a hidden light drops out of the light count, and a change in that count recompiles every material
// on each trip through the door. So they're always there, and simply at 0 away from the house.
//
// The lantern and the fire cast the room's shadows (the daylight's key is off indoors: Atmosphere.tsx),
// so the player's shadow falls away from them. Their shadow maps are only redrawn in the house, and
// on a low-tier device (phones) only the lantern casts: each one is six more renders of the room.
// When both cast, they take turns, one redrawn each frame: half the cost, and a shadow a frame behind
// a moving player doesn't show.

const PENDANT = { x: 0, y: 2.25, z: 2.4 } // the hanging lantern, house-local, over the front of the rug (further back, it hides the fire from the room's low camera); the cord runs up out of sight
const CEILING = { day: 4.5, night: 12, distance: 13 } // its light, candela; it pools under the lantern and fades to the walls
const LAMP = { day: 1, night: 2.5, distance: 3.5, y: 1.1 } // the paper lamp's light, at the height of its shade
const FIRE = { day: 3, night: 6, distance: 6, y: 0.5, z: 0.55, color: '#ff9a4a' } // the fireplace's light, just out of its opening (from the piece's centre; the model's front is at 0.35: inside it, light leaks round the stones' edges), flickering
const FLICKER = 0.15 // how much the fire's light flickers either way (a third of it with reduced motion)
const DRIFT = 0.025 // how far the lantern swings on its cord, radians (still with reduced motion)
const CORD = 3 // the cord's length above the lantern; it swings from the top
const SHADOW = { map: 512, bias: -0.002, normalBias: 0.02, radius: 4 } // the lantern's and the fire's shadows (cube maps)
const FIRE_SHADOW = detectTier() === 'high'
const SNAP = 18 // how fast the lantern comes on or goes out at the switch (a damp rate, per second): a bulb's quick fade

/** The ceiling lantern's paper: the same, but it goes dark with the switch. */
const lanternMaterial = shadeMaterial.clone()
let lit = 1 // the ceiling lantern, 0 (off) to 1 (on), easing after the switch
let turn = false // which light's shadow is redrawn this frame, when both cast

const lantern = new CylinderGeometry(0.26, 0.3, 0.42, 12)
const cap = new CylinderGeometry(0.1, 0.12, 0.05, 10)
const cord = new CylinderGeometry(0.012, 0.012, 3, 4)
const dark = new MeshLambertMaterial({ color: '#3a2a20' })

const mix = (a: number, b: number) => a + (b - a) * sky.weather.night

/** The ceiling lantern; mount in the house's group (Game.tsx). */
export function Pendant() {
  const swing = useRef<Group>(null)
  useSceneFrame('house', ({ clock }) => {
    const g = swing.current
    if (!g) return
    const t = clock.elapsedTime
    const k = reducedMotion() ? 0 : DRIFT
    g.rotation.x = Math.sin(t * 0.7) * k
    g.rotation.z = Math.sin(t * 0.53 + 1) * k * 0.6
  })
  const top = 0.23 + CORD
  return (
    <group ref={swing} position={[INTERIOR.x + PENDANT.x, PENDANT.y + top, INTERIOR.z + PENDANT.z]} userData={{ noShadow: true }}>
      <group position-y={-top}>
        <mesh geometry={lantern} material={lanternMaterial} />
        <mesh geometry={cap} material={dark} position-y={0.23} />
        <mesh geometry={cord} material={dark} position-y={0.23 + CORD / 2} />
      </group>
    </group>
  )
}

/** The room's lights, in world space; mount where they're never hidden (Game.tsx, beside Atmosphere). */
export function RoomLights() {
  const ceiling = useRef<PointLight>(null)
  const lamp = useRef<PointLight>(null)
  const fire = useRef<PointLight>(null)

  useEffect(() => {
    for (const [light, far] of [[ceiling.current, CEILING.distance], [fire.current, FIRE.distance]] as const) {
      if (!light) continue
      const s = light.shadow
      s.mapSize.set(SHADOW.map, SHADOW.map)
      s.bias = SHADOW.bias
      s.normalBias = SHADOW.normalBias
      s.radius = SHADOW.radius
      s.camera.near = 0.1
      s.camera.far = far
    }
  }, [])

  useFrame(({ clock }, dt) => {
    const c = ceiling.current
    const l = lamp.current
    if (!c || !l) return
    const home = useGame.getState().scene === 'house'
    const on = useLightSwitch.getState().on ? 1 : 0
    lit += (on - lit) * Math.min(1, dt * SNAP)
    shadeMaterial.emissiveIntensity = mix(GLOW.day, GLOW.night)
    lanternMaterial.emissiveIntensity = shadeMaterial.emissiveIntensity * lit
    c.intensity = home ? mix(CEILING.day, CEILING.night) * lit : 0
    turn = !turn
    c.shadow.autoUpdate = false
    c.shadow.needsUpdate = home && (!FIRE_SHADOW || turn)
    // The lamp's light follows it round the room, into the hand too while it's being moved.
    const owned = useOwned.getState().owned.includes('lamp')
    l.intensity = home && owned ? mix(LAMP.day, LAMP.night) : 0
    if (owned) {
      const h = useEdit.getState().held
      const at = h && h.id === 'lamp' && useGame.getState().editing ? h.at : useRoom.getState().spots.lamp
      const p = PIECE.lamp
      l.position.set(INTERIOR.x + at.i + (p.w - 1) / 2, LAMP.y, INTERIOR.z + at.j + (p.d - 1) / 2)
    }
    // The fire's light, flickering, follows the fireplace like the lamp's.
    const f = fire.current
    if (f) {
      const t = clock.elapsedTime
      const flick = 1 + FLICKER * (reducedMotion() ? 0.3 : 1) * (Math.sin(t * 9) * 0.6 + Math.sin(t * 23 + 1) * 0.4)
      f.intensity = home ? mix(FIRE.day, FIRE.night) * flick : 0
      f.shadow.autoUpdate = false
      f.shadow.needsUpdate = home && FIRE_SHADOW && !turn
      const h = useEdit.getState().held
      const at = h && h.id === 'fireplace' && useGame.getState().editing ? h.at : useRoom.getState().spots.fireplace
      const p = PIECE.fireplace
      f.position.set(INTERIOR.x + at.i + (p.w - 1) / 2, FIRE.y, INTERIOR.z + at.j + (p.d - 1) / 2 + FIRE.z)
    }
  })

  return (
    <>
      <pointLight ref={ceiling} castShadow color={WARM} intensity={0} distance={CEILING.distance} decay={2} position={[INTERIOR.x + PENDANT.x, PENDANT.y - 0.15, INTERIOR.z + PENDANT.z]} />
      <pointLight ref={lamp} color={WARM} intensity={0} distance={LAMP.distance} decay={2} />
      <pointLight ref={fire} castShadow={FIRE_SHADOW} color={FIRE.color} intensity={0} distance={FIRE.distance} decay={2} />
    </>
  )
}
