import { useEffect } from 'react'
import { MeshLambertMaterial } from 'three'
import { block } from '../core/geometry'
import { register } from '../core/interact'
import { click } from '../core/sfx'
import { DOOR, INTERIOR, ROOM } from '../world/layout'
import { flipLight, useLightSwitch } from './lights'

// A light switch on the low front wall, just right of the door (House.tsx), on its inner face, so it
// isn't on the outside of the house; the camera, looking in over that wall, doesn't see it, but its
// prompt shows when you stand by it. It turns the ceiling lantern off and on (RoomLights.tsx). The
// toggle tips up when it's on. Not on the door post itself: the prompt and the Bag sit over the doorway on screen.

const AT = { x: DOOR + 0.5, y: 0.19, z: ROOM.hz } // house-local: on the front wall's inner face (the wall runs from z hz to hz + 0.5, 0.35 tall), facing into the room
const PLATE = { w: 0.14, h: 0.2, d: 0.02 }
const TOGGLE = { w: 0.05, h: 0.07, d: 0.035, tip: 0.35 } // the rocker, and how far it tips (radians)
const USE = { dz: -0.25, range: 0.8 } // used from inside, standing at the wall; short, so it isn't in focus the moment you come in

const plate = block(-PLATE.w / 2, PLATE.w / 2, -PLATE.h / 2, PLATE.h / 2, 0, PLATE.d)
const toggle = block(-TOGGLE.w / 2, TOGGLE.w / 2, -TOGGLE.h / 2, TOGGLE.h / 2, 0, TOGGLE.d)
const plateMaterial = new MeshLambertMaterial({ color: '#f4ead2' })
const toggleMaterial = new MeshLambertMaterial({ color: '#a8936c' })

export function LightSwitch() {
  const on = useLightSwitch((s) => s.on)

  useEffect(
    () =>
      register({
        x: INTERIOR.x + AT.x,
        z: INTERIOR.z + AT.z + USE.dz,
        range: USE.range,
        prompt: on ? 'Lights off' : 'Lights on',
        onInteract: () => {
          click()
          flipLight()
        },
      }),
    [on],
  )

  return (
    <group position={[INTERIOR.x + AT.x, AT.y, INTERIOR.z + AT.z]} rotation-y={Math.PI}>
      <mesh geometry={plate} material={plateMaterial} />
      <mesh geometry={toggle} material={toggleMaterial} position-z={PLATE.d} rotation-x={on ? -TOGGLE.tip : TOGGLE.tip} />
    </group>
  )
}
