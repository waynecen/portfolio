import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AnimationMixer,
  LoopOnce,
  Box3,
  MathUtils,
  Quaternion,
  Vector3,
  type Bone,
  type AnimationAction,
  type Mesh,
} from 'three'
import { toLambert, useGLB } from '../core/gltf'
import { CLIPS, PLAYER_HEIGHT, PLAYER_WIDTH } from './models'
import { playerFacing, playerPos, playerVel } from '../core/state'
import { useGame } from '../core/store'
import { reducedMotion } from '../core/settings'

// The player as a rigged 3D model (made in Tripo; see docs/CHARACTER.md), shown inside
// PillCharacter's rig, which turns it and leans it into its movement. Its own clips do the
// walking: idle, walk and run blend by speed. Loaded lazily, only when PLAYER_MODEL is set, so the
// loader code stays out of the game chunk until then.

const BLEND = 10 // how quickly the clip weights follow speed changes
const IDLE_PAUSE = 5 // seconds the model stands still after stopping, and between plays of its idle clip
const BREATHE = 0.012 // height swell while standing still (two slow breaths per pause), so it never looks frozen
const WALK_RATE = [0.6, 1.25] // walk clip playback speed for a clip with no recorded pace: at a slow amble, and at full walk
// Playback speed limits when matching a clip's pace to the ground speed. A clip far slower than the
// player moves would otherwise run comically fast; past MAX_RATE the feet slide instead.
const MIN_RATE = 0.3
const MAX_RATE = 3
const RUN_MAX_RATE = 2.75 // the run looks frantic sooner; 2.75× keeps pace up to a full sprint (5 units/s)
// Looking: the head (and a little of the neck) turns toward whatever has focus (a sign, a villager),
// on top of the clips, easing in and out.
const LOOK_MAX = 0.75 // most it turns, radians either way (about 43°)
const LOOK_EASE = 6 // how quickly it follows
const LOOK_NECK = 0.4 // the neck's share of the turn; the head takes the rest
const LOOK_FRONT = 1.6 // only for something within this angle of straight ahead (about 90°)
const UP = new Vector3(0, 1, 0)
const turnBy = new Quaternion()

// World units per second a clip covers at normal speed, from the pace npm run models recorded
// (extras.travel, in body heights per second), or 0 if it has none.
const paceOf = (a: AnimationAction | null) => ((a?.getClip().userData.travel as number | undefined) ?? 0) * PLAYER_HEIGHT

export default function ModelCharacter({ url }: { url: string }) {
  const gltf = useGLB(url)

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
    // The idle plays once, then holds its last pose (the same as its first, as clips loop seamlessly)
    // for IDLE_PAUSE. It starts held, so the first one plays after standing still for a moment.
    if (idle) {
      idle.paused = true
      idle.setLoop(LoopOnce, 1)
      idle.clampWhenFinished = true
    }
    if (!idle && !walk) console.warn(`Player model has none of the clips ${CLIPS.idle} / ${CLIPS.walk}; it will stand still.`)
    // The head and neck bones, for looking (Mixamo names; the loader drops the colon). Either may be missing.
    let head: Bone | null = null
    let neck: Bone | null = null
    root.traverse((o) => {
      if (!(o as Bone).isBone) return
      if (/Head$/.test(o.name)) head = o as Bone
      else if (/Neck$/.test(o.name)) neck = o as Bone
    })
    return { root, mixer, idle, walk, run, walkPace: paceOf(walk), runPace: paceOf(run), w: { idle: 1, walk: 0, run: 0 }, rest: 0, height: s, head, neck, look: 0, turned: { head: 0, neck: 0 } }
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
    const speed = playerVel.speed
    // speed 0 → idle, 1 → walk, 1.5 and up (sprint) → run. Without a run clip, walk covers sprinting too.
    const toRun = run ? MathUtils.clamp((speed - 1) * 2, 0, 1) : 0
    const toWalk = Math.min(1, speed) * (1 - toRun)
    w.walk = MathUtils.damp(w.walk, toWalk, BLEND, dt)
    w.run = MathUtils.damp(w.run, toRun, BLEND, dt)
    w.idle = 1 - w.walk - w.run
    idle?.setEffectiveWeight(walk ? w.idle : 1)
    walk?.setEffectiveWeight(w.walk)
    run?.setEffectiveWeight(w.run)
    if (idle) {
      if (speed > 0.05) {
        // Moving: hold the idle at its start, so stopping always begins with a still pause.
        idle.paused = true
        idle.time = 0
        rig.rest = 0
      } else if (idle.paused && (rig.rest += dt) >= IDLE_PAUSE) {
        idle.reset() // play it from the start
        rig.rest = 0
      }
      // Breathing while held: zero at both ends of the pause, so it joins the clip without a jump.
      const b = idle.paused ? Math.sin((2 * Math.PI * rig.rest) / IDLE_PAUSE) ** 2 * BREATHE * w.idle : 0
      rig.root.scale.y = rig.height * (1 + b)
    }
    // Each clip plays at the rate where its feet keep pace with the ground, so they don't skate.
    const ground = speed > 0 ? Math.hypot(playerVel.x, playerVel.z) : 0
    if (walk)
      walk.timeScale = rig.walkPace
        ? MathUtils.clamp(ground / rig.walkPace, MIN_RATE, MAX_RATE)
        : MathUtils.lerp(WALK_RATE[0], WALK_RATE[1], Math.min(1, speed)) * (run ? 1 : Math.max(1, speed))
    if (run && rig.runPace) run.timeScale = MathUtils.clamp(ground / rig.runPace, MIN_RATE, RUN_MAX_RATE)
    // Take off last frame's look first. The mixer only writes a bone when its animated value changes
    // (PropertyMixer.apply), so while the idle holds a pose it leaves the head as we left it, and the
    // look would add up frame after frame: the head spun round.
    const h = rig.head as Bone | null
    const n = rig.neck as Bone | null
    if (h && rig.turned.head) h.quaternion.multiply(turnBy.setFromAxisAngle(UP, -rig.turned.head)).normalize()
    if (n && rig.turned.neck) n.quaternion.multiply(turnBy.setFromAxisAngle(UP, -rig.turned.neck)).normalize()
    rig.turned.head = rig.turned.neck = 0
    rig.mixer.update(dt)

    // Look toward the focus, relative to where the body faces, after the clips have posed the bones.
    const f = useGame.getState().focus
    let want = 0
    if (f) {
      let a = Math.atan2(f.x - playerPos.x, f.z - playerPos.z) - playerFacing.heading
      a = ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
      want = Math.abs(a) < LOOK_FRONT ? MathUtils.clamp(a, -LOOK_MAX, LOOK_MAX) : 0 // only things roughly in front; no glancing over a shoulder
    }
    rig.look = reducedMotion() ? want : MathUtils.damp(rig.look, want, LOOK_EASE, dt)
    if (Math.abs(rig.look) > 0.001) {
      rig.turned.head = h ? rig.look * (n ? 1 - LOOK_NECK : 1) : 0
      rig.turned.neck = n ? rig.look * LOOK_NECK : 0
      if (h) h.quaternion.multiply(turnBy.setFromAxisAngle(UP, rig.turned.head))
      if (n) n.quaternion.multiply(turnBy.setFromAxisAngle(UP, rig.turned.neck))
    }
  })

  return <primitive object={rig.root} />
}
