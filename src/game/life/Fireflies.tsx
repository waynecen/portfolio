import { useRef } from 'react'
import { type Points } from 'three'
import { geometry, material, place } from './swarm'
import { winter } from '../world/season'
import { sky } from '../world/sky'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'

// Night on the island: small warm lights drifting low over the grass, each wandering round its own
// spot and twinkling on and off (swarm.ts). One set of points, faded in and out with the night weather.

export function Fireflies() {
  const points = useRef<Points>(null)

  useSceneFrame('world', ({ clock }) => {
    const night = sky.weather.night
    if (!points.current) return
    points.current.visible = night > 0
    if (night <= 0) return
    material.opacity = night
    place(reducedMotion() ? 0 : clock.elapsedTime) // held still with reduced motion, but caught ones still go dark
  })

  if (winter) return null // no fireflies in the cold
  // Not culled: they're spread over the whole island and move every frame.
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
