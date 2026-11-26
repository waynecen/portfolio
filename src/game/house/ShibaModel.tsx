import { useMemo, useRef } from 'react'
import { Box3, PropertyBinding, type Group, Quaternion, Vector3, type Bone, type Mesh, type Object3D } from 'three'
import { lambertAll, useGLB } from '../core/gltf'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'
import { sky } from '../world/sky'
import { playerPos } from '../core/state'
import { dog } from './shiba'

// Katsu as the Tripo model (models-src/shiba.glb, through npm run models), in place of the block dog
// in Dog.tsx, which stands in while it loads. The model is rigged but has no clips, so its bones are
// turned here: it walks with a dog's four-beat gait (each foot planted while the body passes over
// it, then lifted and swung forward), or trots in diagonal pairs when it hurries off, bobbing with
// its steps; and the tail wags. Its head looks where it's going, leading the body round a turn.
// Petted, it stands still with its feet on the floor, looks at the player with its head tipped to
// one side and up, and wags harder. Dog.tsx turns the whole dog and tips it back to sit. Turned to face +z,
// like the blocks.

const URL = '/models/shiba.glb'
const HEIGHT = 0.7 // to the ear tips, as the blocks
const FILL = { day: 0.2, night: 0.12 } // the soft studio fill every room model has (PropModel.tsx)
// As made, the model faces 35° round from +z (its torso's long axis and legs say so), and its head is
// turned a further 27° to its right and tipped 7° that way (the line of its ears). All are turned back.
const TURN = 0.61 // radians about y, so its body faces +z
const HEAD = { bone: 'tripo::Head_1', turn: -0.46, roll: 0.12 } // the head (not Head_0: the front legs hang from that); radians about up, and about its nose
// The bones (Tripo's names; the loader turns their colons into underscores), each swung about an axis
// in the dog's own frame: x across it, z along it. Each leg has an upper bone that swings it and a
// lower one that folds to lift the foot. `walk` and `trot` are when in the cycle (0 to 1) each foot
// sets down: a walk goes back left, front left, back right, front right, a beat apart; a trot moves
// diagonal pairs together.
const LEGS = [
  { upper: 'tripo::1_Left_Limb_1', lower: 'tripo::1_Left_Limb_2', walk: 0, trot: 0 }, // back left
  { upper: 'tripo::0_Right_Limb_0', lower: 'tripo::0_Right_Limb_1', walk: 0.25, trot: 0.5 }, // front left
  { upper: 'bone_3', lower: 'bone_4', walk: 0.5, trot: 0.5 }, // back right
  { upper: 'tripo::0_Left_Limb_0', lower: 'tripo::0_Left_Limb_1', walk: 0.75, trot: 0 }, // front right (+x, once turned)
] as const
const TAIL = 'bone_11'
const REACH = 0.52 // how far each leg swings either side of straight down, radians
const LEG = 0.26 // hip to foot, world units: with REACH, how far a planted foot travels back each step
const STANCE = { walk: 0.65, trot: 0.5 } // the share of each cycle a foot is down
const LIFT = 0.7 // how far the lower leg folds at the top of a step, radians, so the foot clears the floor
const BOB = 0.04 // how high it bobs with its steps, twice a cycle
const EASE = 8 // how quickly it settles into its gait and out of it, per second
const LOOK = { max: 0.9, ease: 8 } // the head turning from the body toward where it looks: most it turns either way (radians), and how fast
const PETTED = { tilt: 0.38, lift: 0.22, ease: 7 } // its head, petted: tipped to one side and up (radians), easing in and out
const WAG = { idle: 0.25, happy: 0.55, idleRate: 7, happyRate: 22 } // the tail's swing (radians) and speed

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const turn = new Quaternion()

type Joint = { bone: Bone; rest: Quaternion; axis: Vector3 }

/** A bone that swings about `along` (in the model's frame) through its own pivot. */
function joint(root: Object3D, name: string, along: Vector3): Joint | null {
  const bone = root.getObjectByName(PropertyBinding.sanitizeNodeName(name)) as Bone | undefined
  if (!bone) return null
  const world = bone.getWorldQuaternion(new Quaternion())
  return { bone, rest: bone.quaternion.clone(), axis: along.clone().applyQuaternion(world.invert()).normalize() }
}
const pose = (j: Joint | null, angle: number) =>
  j && j.bone.quaternion.copy(j.rest).multiply(turn.setFromAxisAngle(j.axis, angle))
const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * One leg at `c` (0 to 1) through its cycle, as [upper, lower] angles about x: planted for `stance`
 * of it, sweeping back steadily from forward (-REACH) as the body passes over, then lifted, the lower
 * leg folding, and swung forward again. A positive angle takes the foot back.
 */
function step(c: number, stance: number): [number, number] {
  if (c < stance) return [-REACH + (2 * REACH * c) / stance, 0]
  const s = (c - stance) / (1 - stance)
  return [REACH - 2 * REACH * smooth(s), Math.sin(Math.PI * s) * LIFT]
}

export default function ShibaModel() {
  const gltf = useGLB(URL)

  const rig = useMemo(() => {
    const root = gltf.scene
    root.scale.setScalar(1)
    root.position.set(0, 0, 0)
    root.rotation.set(0, TURN, 0)
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const s = HEIGHT / (size.y || 1)
    root.scale.setScalar(s)
    root.position.set(-centre.x * s, -box.min.y * s, -centre.z * s)
    root.updateMatrixWorld(true)
    const materials = lambertAll(root)
    root.traverse((o) => {
      if ((o as Mesh).isMesh) o.frustumCulled = false // a skinned mesh's bounds don't follow its bones
    })
    const legs = LEGS.map((l) => ({ ...l, top: joint(root, l.upper, X), knee: joint(root, l.lower, X) }))
    const tail = joint(root, TAIL, Z)
    const head = joint(root, HEAD.bone, Y)
    const nod = joint(root, HEAD.bone, Z)
    const lift = joint(root, HEAD.bone, X)
    if (head && nod) head.bone.quaternion.copy(head.rest).multiply(turn.setFromAxisAngle(head.axis, HEAD.turn)).multiply(turn.setFromAxisAngle(nod.axis, HEAD.roll))
    // Its head as straightened, to tip from when petted.
    const face = head && nod && lift ? { bone: head.bone, rest: head.bone.quaternion.clone(), turn: head.axis, roll: nod.axis, lift: lift.axis } : null
    if (legs.some((l) => !l.top || !l.knee) || !tail || !head)
      console.warn('shiba.glb: some bones are missing; it will trot stiffly.')
    return { root, materials, legs, tail, face }
  }, [gltf])

  const bob = useRef<Group>(null)
  const gait = useRef({ cycle: 0, on: 0, petted: 0, look: 0 }) // where it is in its stride (0 to 1), and how far into its gait (0 standing, 1 walking)

  useSceneFrame('house', ({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    const still = reducedMotion()
    const f = FILL.day + (FILL.night - FILL.day) * sky.weather.night
    for (const m of rig.materials) m.emissiveIntensity = f
    // The stride: as long as it takes the body to pass over a planted foot, so the feet don't slide.
    const g = gait.current
    const going = dog.moving && !still
    const hurry = dog.speed > 1.2 // trotting off after a bump (TROT in shiba.ts), not wandering
    const stance = hurry ? STANCE.trot : STANCE.walk
    if (going) g.cycle = (g.cycle + (dt * dog.speed * stance) / (2 * LEG * Math.sin(REACH))) % 1
    g.on += ((going ? 1 : 0) - g.on) * (1 - Math.exp(-EASE * dt))
    for (const l of rig.legs) {
      const [upper, lower] = step((g.cycle - (hurry ? l.trot : l.walk) + 1) % 1, stance)
      pose(l.top, upper * g.on)
      pose(l.knee, lower * g.on)
    }
    // Up as the legs pass under it, down as they reach: twice a cycle.
    if (bob.current) bob.current.position.y = (0.5 - 0.5 * Math.cos(4 * Math.PI * g.cycle)) * BOB * g.on
    // The head: toward the player while petted, otherwise where it's heading (which leads the body
    // round a turn), as an angle from where the body faces; tipped to one side and up while petted.
    g.petted += ((dog.sit > 0 ? 1 : 0) - g.petted) * (1 - Math.exp(-PETTED.ease * dt))
    const toward = dog.sit > 0 ? Math.atan2(playerPos.x - dog.x, playerPos.z - dog.z) : dog.heading
    const want = Math.max(-LOOK.max, Math.min(LOOK.max, Math.atan2(Math.sin(toward - dog.shown), Math.cos(toward - dog.shown))))
    g.look += (want - g.look) * (1 - Math.exp(-LOOK.ease * dt))
    const f2 = rig.face
    if (f2) {
      const k = smooth(Math.min(1, g.petted))
      f2.bone.quaternion
        .copy(f2.rest)
        .multiply(turn.setFromAxisAngle(f2.turn, g.look))
        .multiply(turn.setFromAxisAngle(f2.roll, PETTED.tilt * k))
        .multiply(turn.setFromAxisAngle(f2.lift, -PETTED.lift * k))
    }
    if (rig.tail) {
      const happy = dog.sit > 0
      pose(rig.tail, still ? 0 : Math.sin(t * (happy ? WAG.happyRate : WAG.idleRate)) * (happy ? WAG.happy : WAG.idle))
    }
  })

  return (
    <group ref={bob}>
      <primitive object={rig.root} />
    </group>
  )
}
