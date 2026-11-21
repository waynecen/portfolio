import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, Fog, type DirectionalLight, type HemisphereLight } from 'three'
import { foamMaterial, waterMaterial } from './Island'
import { currentHour, sample, sky } from './sky'
import { useGame } from '../core/store'

// Lights, background and fog for the time of day (see sky.ts). Outdoors they follow the sky;
// indoors the room is lit by a fixed lamp-like set, warmer and dimmer at night, on black.

const RECHECK = 5 // seconds between reads of the clock

const DARK = new Color('#000000') // indoors, everything past the room's walls
const ROOM_DAY = { sky: new Color('#ffffff'), ground: new Color('#88aa77'), hemi: 1.2, sun: new Color('#ffffff'), sunI: 1.5 }
const ROOM_NIGHT = { sky: new Color('#ffe2bd'), ground: new Color('#6a5a48'), hemi: 0.85, sun: new Color('#ffcf8f'), sunI: 1 }
// The cave (CaveRooms.tsx): cool and dim, lit mostly by the player's own glow (PlayerGround.tsx) and the torches.
const CAVE_LIGHT = { sky: new Color('#9aa8c8'), ground: new Color('#3a3540'), hemi: 0.75, sun: new Color('#c9d3f0'), sunI: 0.55 }
const NO_FOG = 1e4 // fog pushed out of sight indoors (turning fog off would recompile every material)

const background = new Color()
const fog = new Fog('#ffffff', NO_FOG, NO_FOG + 1)

export function Atmosphere() {
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const scene = useThree((s) => s.scene)
  const clock = useRef(0)

  useEffect(() => {
    scene.background = background
    scene.fog = fog
    return () => {
      scene.background = null
      scene.fog = null
    }
  }, [scene])

  useFrame((_, delta) => {
    clock.current += delta
    if (clock.current >= RECHECK) {
      clock.current = 0
      sample(currentHour(), sky)
    }
    const h = hemi.current
    const s = sun.current
    if (!h || !s) return

    waterMaterial.color.copy(sky.water)
    foamMaterial.color.copy(sky.foam)

    const where = useGame.getState().scene
    if (where === 'cave') {
      background.copy(DARK)
      s.position.set(2, 10, 6)
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
      s.position.set(5, 10, 4)
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
    s.position.copy(sky.sunFrom)
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
