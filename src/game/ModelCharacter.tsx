import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AnimationMixer,
  Box3,
  MathUtils,
  MeshLambertMaterial,
  Vector3,
  type AnimationAction,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { CLIPS, PLAYER_HEIGHT, PLAYER_WIDTH } from './models'
import { playerRoll, playerVel } from './state'

// The player as a rigged 3D model (made in Tripo; see docs/CHARACTER.md), shown inside
// PillCharacter's rig, which still turns it and tumbles it through rolls. Its own clips do the
// walking: idle, walk and run blend by speed. Loaded lazily, only when PLAYER_MODEL is set, so the
// loader code stays out of the game chunk until then.

const BLEND = 10 // how quickly the clip weights follow speed changes
const WALK_RATE = [0.6, 1.25] // walk clip playback speed for a clip with no recorded pace: at a slow amble, and at full walk
// Playback speed limits when matching a clip's pace to the ground speed. A clip far slower than the
// player moves would otherwise run comically fast; past MAX_RATE the feet slide instead.
const MIN_RATE = 0.3
const MAX_RATE = 3

// World units per second a clip covers at normal speed, from the pace npm run models recorded
// (extras.travel, in body heights per second), or 0 if it has none.
const paceOf = (a: AnimationAction | null) => ((a?.getClip().userData.travel as number | undefined) ?? 0) * PLAYER_HEIGHT

// The island is lit with Lambert materials; the model's PBR ones would look out of place (and cost
// more), so each keeps its texture and colour on a Lambert material instead.
function toLambert(material: Material): Material {
  const m = material as MeshStandardMaterial
  return new MeshLambertMaterial({
    map: m.map ?? null,
    color: m.color ?? 0xffffff,
    vertexColors: m.vertexColors,
    transparent: m.transparent,
    alphaTest: m.alphaTest,
    side: m.side,
  })
}

export default function ModelCharacter({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url, (loader) => loader.setMeshoptDecoder(MeshoptDecoder))

  const rig = useMemo(() => {
    const root = gltf.scene
    // Fit it to PLAYER_HEIGHT, feet on the ground and centred on the player, whatever size it was made at.
    root.scale.setScalar(1)
    root.position.set(0, 0, 0)
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const s = PLAYER_HEIGHT / (size.y || 1)
    const w = s * PLAYER_WIDTH // stockier than modelled, at the same height
    root.scale.set(w, s, w)
    root.position.set(-centre.x * w, -box.min.y * s, -centre.z * w)
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toLambert) : toLambert(mesh.material)
      mesh.frustumCulled = false // a skinned mesh's bounds don't follow its animation
    })

    const mixer = new AnimationMixer(root)
    const action = (name: string): AnimationAction | null => {
      const clip = gltf.animations.find((c) => c.name === name)
      if (!clip) return null
      const a = mixer.clipAction(clip)
      a.play()
      a.setEffectiveWeight(0)
      return a
    }
    const idle = action(CLIPS.idle)
    const walk = action(CLIPS.walk)
    const run = action(CLIPS.run)
    if (!idle && !walk) console.warn(`Player model has none of the clips ${CLIPS.idle} / ${CLIPS.walk}; it will stand still.`)
    return { root, mixer, idle, walk, run, walkPace: paceOf(walk), runPace: paceOf(run), w: { idle: 1, walk: 0, run: 0 } }
  }, [gltf])

  useEffect(
    () => () => {
      rig.mixer.stopAllAction()
    },
    [rig],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const { idle, walk, run, w } = rig
    // During a roll the rig tumbles the whole model; it holds its idle pose meanwhile.
    const speed = playerRoll.p >= 0 ? 0 : playerVel.speed
    // speed 0 → idle, 1 → walk, 1.5 (sprint) → run. Without a run clip, walk covers sprinting too.
    const toRun = run ? MathUtils.clamp((speed - 1) * 2, 0, 1) : 0
    const toWalk = Math.min(1, speed) * (1 - toRun)
    w.walk = MathUtils.damp(w.walk, toWalk, BLEND, dt)
    w.run = MathUtils.damp(w.run, toRun, BLEND, dt)
    w.idle = 1 - w.walk - w.run
    idle?.setEffectiveWeight(walk ? w.idle : 1)
    walk?.setEffectiveWeight(w.walk)
    run?.setEffectiveWeight(w.run)
    // Each clip plays at the rate where its feet keep pace with the ground, so they don't skate.
    const ground = speed > 0 ? Math.hypot(playerVel.x, playerVel.z) : 0
    if (walk)
      walk.timeScale = rig.walkPace
        ? MathUtils.clamp(ground / rig.walkPace, MIN_RATE, MAX_RATE)
        : MathUtils.lerp(WALK_RATE[0], WALK_RATE[1], Math.min(1, speed)) * (run ? 1 : Math.max(1, speed))
    if (run && rig.runPace) run.timeScale = MathUtils.clamp(ground / rig.runPace, MIN_RATE, MAX_RATE)
    rig.mixer.update(dt)
  })

  return <primitive object={rig.root} />
}
