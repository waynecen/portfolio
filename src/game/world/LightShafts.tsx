import { useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, CanvasTexture, Color, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { useSceneFrame } from '../core/sceneFrame'
import { reducedMotion } from '../core/settings'
import { playerPos } from '../core/state'
import { sky } from './sky'

// Light shafts at dawn and in the evening: a few long, soft cards of light slanting down along the
// sun's direction round the player, each turned to face the camera about its own length. Additive,
// so they only ever brighten; they breathe slowly in and out. Gone in clear morning light, in rain
// and at night. Cheap: a handful of quads, no post effect.

const SPOTS = [
  [-4, -3], [2.5, -4], [5, -1.5], [-5.5, 1.5], [1, 1.5],
] // where each shaft meets the ground, round the player
const LENGTH = 9 // how long a shaft is, up toward the sun
const WIDTH = 0.45
const STRENGTH = 0.1 // opacity at full golden or misty light
const BREATHE = 0.35 // how far each fades in and out, as a share of its strength

function gradient() {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 128
  const g = c.getContext('2d')!
  // Soft at the sides, fading out at both ends (brightest a little above the ground).
  const along = g.createLinearGradient(0, 0, 0, 128)
  along.addColorStop(0, 'rgba(255,255,255,0)')
  along.addColorStop(0.55, 'rgba(255,255,255,0.8)')
  along.addColorStop(0.85, 'rgba(255,255,255,1)')
  along.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = along
  g.fillRect(0, 0, 32, 128)
  g.globalCompositeOperation = 'destination-in'
  const across = g.createLinearGradient(0, 0, 32, 0)
  across.addColorStop(0, 'rgba(0,0,0,0)')
  across.addColorStop(0.5, 'rgba(0,0,0,1)')
  across.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = across
  g.fillRect(0, 0, 32, 128)
  return new CanvasTexture(c)
}

const geometry = new PlaneGeometry(WIDTH, LENGTH)
const material = new MeshBasicMaterial({ map: gradient(), transparent: true, depthWrite: false, blending: AdditiveBlending, color: new Color(), fog: false })

const dir = new Vector3()
const toCamera = new Vector3()
const side = new Vector3()
const facing = new Vector3()
const basis = new Matrix4()

export function LightShafts() {
  const camera = useThree((s) => s.camera)
  const meshes = useRef<(Mesh | null)[]>([])

  useSceneFrame('world', ({ clock }) => {
    const w = sky.weather
    const amount = (w.golden + w.mist) * (1 - w.rain) * (1 - w.night)
    material.color.copy(sky.sun).multiplyScalar(STRENGTH * amount)
    const visible = amount > 0.01
    dir.copy(sky.sunFrom).normalize()
    for (let k = 0; k < SPOTS.length; k++) {
      const m = meshes.current[k]
      if (!m) continue
      m.visible = visible
      if (!visible) continue
      const [ox, oz] = SPOTS[k]
      // Centre: half a shaft up the sun's direction from where it meets the ground.
      m.position.set(playerPos.x + ox, 0, playerPos.z + oz).addScaledVector(dir, LENGTH / 2)
      // Turn the card about its length to face the camera as nearly as it can.
      toCamera.subVectors(camera.position, m.position)
      facing.copy(toCamera).addScaledVector(dir, -toCamera.dot(dir)).normalize()
      side.crossVectors(dir, facing)
      basis.makeBasis(side, dir, facing)
      m.quaternion.setFromRotationMatrix(basis)
      const breathe = reducedMotion() ? 1 : 1 - BREATHE * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 0.4 + k * 1.7))
      m.scale.set(breathe, 1, 1) // narrower as it fades: reads as light thinning, not blinking
    }
  })

  return (
    <>
      {SPOTS.map((_, k) => (
        <mesh
          key={k}
          ref={(el) => {
            meshes.current[k] = el
          }}
          geometry={geometry}
          material={material}
          frustumCulled={false}
          userData={{ noShadow: true }}
        />
      ))}
    </>
  )
}
