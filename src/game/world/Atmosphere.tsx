import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, Fog, Vector3, type DirectionalLight, type HemisphereLight } from 'three'
import { waterMaterial } from './Island'
import { currentHour, sample, sky } from './sky'
import { useGame } from '../core/store'
import { followPlayer, setUpShadow } from './Shadows'
import { tickWind } from '../core/wind'

// Lights, background and fog for the time of day (see sky.ts). Outdoors they follow the sky;
// indoors the room is lit by a fixed lamp-like set, warmer and dimmer at night, on black.

const RECHECK = 5 // seconds between reads of the clock

const DARK = new Color('#000000') // indoors, everything past the room's walls
// Soft, like a cosy life-sim room: nearly all of it is even, warm fill, with a pale ground colour so
// light seems to bounce off the floor into the sides of things, and only a faint key, so shading is
// gentle and nothing looks harsh. At night the fill drops and the room's own lamps (house/RoomLights.tsx)
// do most of the lighting, in warm pools.
const ROOM_DAY = { sky: new Color('#fff3e4'), ground: new Color('#e6d2b4'), hemi: 1.85, sun: new Color('#fff0dc'), sunI: 0.3 }
const ROOM_NIGHT = { sky: new Color('#e0c09a'), ground: new Color('#8a6e52'), hemi: 1.05, sun: new Color('#ffc890'), sunI: 0.15 }
// The cave (CaveRooms.tsx): cool and dim, lit mostly by the player's own glow (PlayerGround.tsx) and the torches.
const CAVE_LIGHT = { sky: new Color('#9aa8c8'), ground: new Color('#3a3540'), hemi: 0.75, sun: new Color('#c9d3f0'), sunI: 0.55 }
const NO_FOG = 1e4 // fog pushed out of sight indoors (turning fog off would recompile every material)

const ROOM_SUN = new Vector3(5, 10, 4) // indoors, where the room's key light comes from
const CAVE_SUN = new Vector3(2, 10, 6)

const background = new Color()
const fog = new Fog('#ffffff', NO_FOG, NO_FOG + 1)

export function Atmosphere() {
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const scene = useThree((s) => s.scene)
  const clock = useRef(0)

  useEffect(() => {
    if (sun.current) {
      setUpShadow(sun.current)
      scene.add(sun.current.target) // so its matrix is kept up to date with the scene's
    }
    scene.background = background
    scene.fog = fog
    return () => {
      scene.background = null
      scene.fog = null
      if (sun.current) scene.remove(sun.current.target)
    }
  }, [scene])

  useFrame((_, delta) => {
    tickWind(delta, sky.weather.rain)
    clock.current += delta
    if (clock.current >= RECHECK) {
      clock.current = 0
      sample(currentHour(), sky)
    }
    const h = hemi.current
    const s = sun.current
    if (!h || !s) return

    waterMaterial.color.copy(sky.water)

    const where = useGame.getState().scene
    if (where === 'cave') {
      background.copy(DARK)
      followPlayer(s, CAVE_SUN)
      fog.near = NO_FOG
      fog.far = NO_FOG + 1
      h.color.copy(CAVE_LIGHT.sky)
      h.groundColor.copy(CAVE_LIGHT.ground)
      h.intensity = CAVE_LIGHT.hemi
      s.color.copy(CAVE_LIGHT.sun)
      s.intensity = CAVE_LIGHT.sunI
      return
    }
    if (where === 'house') {
      const n = sky.weather.night
      background.copy(DARK)
      followPlayer(s, ROOM_SUN)
      fog.near = NO_FOG
      fog.far = NO_FOG + 1
      h.color.lerpColors(ROOM_DAY.sky, ROOM_NIGHT.sky, n)
      h.groundColor.lerpColors(ROOM_DAY.ground, ROOM_NIGHT.ground, n)
      h.intensity = ROOM_DAY.hemi + (ROOM_NIGHT.hemi - ROOM_DAY.hemi) * n
      s.color.lerpColors(ROOM_DAY.sun, ROOM_NIGHT.sun, n)
      s.intensity = ROOM_DAY.sunI + (ROOM_NIGHT.sunI - ROOM_DAY.sunI) * n
      return
    }
    background.copy(sky.background)
    followPlayer(s, sky.sunFrom)
    fog.color.copy(sky.fog)
    fog.near = sky.fogNear
    fog.far = sky.fogFar
    h.color.copy(sky.hemiSky)
    h.groundColor.copy(sky.hemiGround)
    h.intensity = sky.hemiIntensity
    s.color.copy(sky.sun)
    s.intensity = sky.sunIntensity
  })

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={sun} />
    </>
  )
}
