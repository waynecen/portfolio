import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { CanvasTexture, MeshBasicMaterial, PlaneGeometry, type Mesh, type PointLight } from 'three'
import { sky } from './sky'
import { playerRoll } from './state'
import { useGame } from './store'

// What sits around the player rather than on them: a soft shadow that keeps the character on the
// ground (the scene casts no real shadows), and at night a small warm light so a dark outfit still
// reads against dark grass and doorways (and, in the cave, always). Mounted in <Player>'s root, outside the rig, so neither
// turns, leans or tumbles with the body.

const SHADOW_SIZE = 0.85 // diameter on the ground, world units
const SHADOW_OPACITY = 0.35
const NIGHT_GLOW = 2.5 // the light's intensity at full night outdoors (candela)
const INDOOR_GLOW = 0.4 // share of that indoors, where the room is already lamp-lit
const CAVE_GLOW = 2 // in the cave, day or night

// A radial gradient, drawn once: dark in the middle, fading to nothing at the edge.
function shadowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0.7)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

const shadowGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
const shadowMat = new MeshBasicMaterial({
  map: shadowTexture(),
  color: '#000000',
  transparent: true,
  opacity: SHADOW_OPACITY,
  depthWrite: false,
  polygonOffset: true, // above the roads, which use -1
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
})

export function PlayerGround() {
  const shadow = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)

  useFrame(() => {
    // Mid-roll the body tucks and drops, so the shadow tightens and lightens a little.
    const p = playerRoll.p
    const env = p >= 0 ? Math.sin(Math.PI * p) : 0
    shadow.current?.scale.setScalar(SHADOW_SIZE * (1 - 0.2 * env))
    shadowMat.opacity = SHADOW_OPACITY * (1 - 0.3 * env)
    // Always mounted, at 0 by day: adding or removing a light would recompile every material.
    const scene = useGame.getState().scene
    if (light.current) light.current.intensity = scene === 'cave' ? CAVE_GLOW : NIGHT_GLOW * sky.weather.night * (scene === 'house' ? INDOOR_GLOW : 1)
  })

  return (
    <>
      <mesh ref={shadow} geometry={shadowGeo} material={shadowMat} position-y={0.02} scale={SHADOW_SIZE} renderOrder={1} />
      {/* Above the head and toward the camera, so it lights the character's front and the ground round it. */}
      <pointLight ref={light} color="#ffd59a" intensity={0} distance={2.5} decay={2} position={[0, 1.3, 0.9]} />
    </>
  )
}
