import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { HalfFloatType } from 'three'
import {
  BloomEffect,
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  RenderPass,
  TiltShiftEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing'
import { useGame } from '../core/store'
import { quality } from '../core/adaptive'
import { sky, type Weather } from './sky'

// The finish on every frame, in one pass after the scene is drawn: bloom on what glows, tone
// mapping, a colour grade for the time of day (or the room, or the cave), and a light vignette.
// The renderer's own tone mapping is off (Canvas `flat` in Game.tsx) so it isn't done twice.
//
// Bloom only catches what's brighter than white once lit: the fire, lantern shades and windows at
// night, fireflies, sparkles. Lit surfaces by day stay under the threshold.

const BLOOM = { threshold: 0.9, smoothing: 0.25, intensity: 1, radius: 0.75 }
// Indoors the lamps light surfaces near them (the fireplace's stones) just past white, which bloomed
// into a glow round them; a higher threshold there leaves only the flames and the shades glowing.
const ROOM_THRESHOLD = 1.15
const VIGNETTE = { offset: 0.32, darkness: 0.42 }
// Photo mode's tilt-shift: a band in focus across the middle (where the player stands), blurring
// above and below, so the island reads as a miniature. Only while taking photos.
const TILT = { focusArea: 0.32, feather: 0.22, offset: 0.04 }

type Grade = { brightness: number; contrast: number; saturation: number }
/** Per weather (sky.ts), blended by how much of each is showing; then indoors and the cave. -1 to 1, 0 = no change. */
const GRADE: Record<Weather | 'house' | 'cave', Grade> = {
  clear: { brightness: 0, contrast: 0.06, saturation: 0.1 }, // morning: crisp and bright
  mist: { brightness: 0.02, contrast: -0.06, saturation: -0.08 }, // dawn: soft and pale
  rain: { brightness: -0.02, contrast: 0.02, saturation: -0.14 }, // afternoon: muted
  golden: { brightness: -0.02, contrast: 0.05, saturation: 0.02 }, // evening: rich, but the sun is warm already
  night: { brightness: 0, contrast: 0.06, saturation: -0.06 }, // night: quiet colour, deep darks
  house: { brightness: 0.02, contrast: -0.02, saturation: 0.06 }, // the room: warm and soft
  cave: { brightness: 0, contrast: 0.1, saturation: -0.12 },
}
const WEATHERS = Object.keys(sky.weather) as Weather[]

export function PostFX() {
  const { gl, scene, camera, size } = useThree()
  const dpr = useThree((s) => s.viewport.dpr) // changed by core/adaptive.ts

  const fx = useMemo(() => {
    // Multisampling, in place of the canvas's own antialiasing (which a composer bypasses): how much is
    // core/adaptive.ts's call, since it costs per pixel.
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: quality.samples })
    const bloom = new BloomEffect({
      luminanceThreshold: BLOOM.threshold,
      luminanceSmoothing: BLOOM.smoothing,
      intensity: BLOOM.intensity,
      radius: BLOOM.radius,
      mipmapBlur: true,
    })
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })
    const light = new BrightnessContrastEffect()
    const colour = new HueSaturationEffect()
    const vignette = new VignetteEffect(VIGNETTE)
    const tilt = new EffectPass(camera, new TiltShiftEffect(TILT))
    tilt.enabled = false
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(tilt)
    composer.addPass(new EffectPass(camera, bloom, tone, light, colour, vignette))
    return { composer, bloom, light, colour, tilt }
  }, [gl, scene, camera])

  useEffect(() => () => fx.composer.dispose(), [fx])
  // Its buffers are sized from the canvas's drawing buffer when this runs, so it runs again whenever
  // the pixel ratio changes, or a lower resolution would still be drawn at the old one.
  useEffect(() => {
    fx.composer.setSize(size.width, size.height)
  }, [fx, size, dpr])

  // Priority 1: R3F stops drawing the scene itself, and this draws it through the composer instead.
  useFrame((_, delta) => {
    const where = useGame.getState().scene
    // When frames run slow, the samples come down before the resolution does (core/adaptive.ts).
    // Setting it frees the buffers; they're made again at the new level by this frame's render.
    if (fx.composer.multisampling !== quality.samples) fx.composer.multisampling = quality.samples
    fx.tilt.enabled = useGame.getState().photo
    fx.bloom.luminanceMaterial.threshold = where === 'house' ? ROOM_THRESHOLD : BLOOM.threshold
    let b = 0
    let c = 0
    let s = 0
    if (where === 'house' || where === 'cave') {
      const g = GRADE[where]
      b = g.brightness
      c = g.contrast
      s = g.saturation
    } else {
      for (const w of WEATHERS) {
        const k = sky.weather[w]
        b += GRADE[w].brightness * k
        c += GRADE[w].contrast * k
        s += GRADE[w].saturation * k
      }
    }
    fx.light.brightness = b
    fx.light.contrast = c
    fx.colour.saturation = s
    fx.composer.render(delta)
  }, 1)

  return null
}
