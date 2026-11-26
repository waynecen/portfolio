import { useMemo } from 'react'
import { Box3, PropertyBinding, Quaternion, Vector3, type Bone, type Mesh, type Object3D } from 'three'
import { lambertAll, useGLB } from '../core/gltf'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'
import { sky } from '../world/sky'
import { dog } from './shiba'

// Kinako as the Tripo model (models-src/shiba.glb, through npm run models), in place of the block dog
// in Dog.tsx, which stands in while it loads. The model is rigged but has no clips, so its bones are
// turned here: the legs swing in diagonal pairs at a trot and the tail wags, harder while it sits
// after a pet. Dog.tsx turns the whole dog and tips it back to sit. Facing +z, like the blocks.

const URL = '/models/shiba.glb'
const HEIGHT = 0.7 // to the ear tips, as the blocks
const FILL = { day: 0.2, night: 0.12 } // the soft studio fill every room model has (PropModel.tsx)
// The bones (Tripo's names; the loader turns their colons into underscores), each swung about an axis in the dog's own frame: x across it, z along it.
const LEGS = [
  { bone: 'tripo::0_Left_Limb_0', phase: 1 }, // front, on its right side (+x)
  { bone: 'tripo::0_Right_Limb_0', phase: -1 }, // front, on its left
  { bone: 'tripo::1_Left_Limb_1', phase: -1 }, // back, inner
  { bone: 'bone_3', phase: 1 }, // back, outer
] as const
const TAIL = 'bone_11'
const SWING = 0.55 // how far the legs swing either way, radians
const STRIDE = 14 // leg swings per unit of speed, as the blocks
const WAG = { idle: 0.25, happy: 0.55, idleRate: 7, happyRate: 22 } // the tail's swing (radians) and speed

const X = new Vector3(1, 0, 0)
const Z = new Vector3(0, 0, 1)
const turn = new Quaternion()

type Joint = { bone: Bone; rest: Quaternion; axis: Vector3; phase: number }

/** A bone that swings about `along` (in the model's frame) through its own pivot. */
function joint(root: Object3D, name: string, along: Vector3, phase: number): Joint | null {
  const bone = root.getObjectByName(PropertyBinding.sanitizeNodeName(name)) as Bone | undefined
  if (!bone) return null
  const world = bone.getWorldQuaternion(new Quaternion())
  return { bone, rest: bone.quaternion.clone(), axis: along.clone().applyQuaternion(world.invert()).normalize(), phase }
}
const pose = (j: Joint, angle: number) => j.bone.quaternion.copy(j.rest).multiply(turn.setFromAxisAngle(j.axis, angle))

export default function ShibaModel() {
  const gltf = useGLB(URL)

  const rig = useMemo(() => {
    const root = gltf.scene
    root.scale.setScalar(1)
    root.position.set(0, 0, 0)
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
    const legs = LEGS.map((l) => joint(root, l.bone, X, l.phase)).filter((j): j is Joint => !!j)
    const tail = joint(root, TAIL, Z, 1)
    if (legs.length < LEGS.length || !tail) console.warn('shiba.glb: some bones are missing; it will trot stiffly.')
    return { root, materials, legs, tail }
  }, [gltf])

  useSceneFrame('house', ({ clock }) => {
    const t = clock.elapsedTime
    const still = reducedMotion()
    const f = FILL.day + (FILL.night - FILL.day) * sky.weather.night
    for (const m of rig.materials) m.emissiveIntensity = f
    const swing = dog.moving && !still ? Math.sin(t * dog.speed * STRIDE) * SWING : 0
    for (const j of rig.legs) pose(j, swing * j.phase)
    if (rig.tail) {
      const happy = dog.sit > 0
      pose(rig.tail, still ? 0 : Math.sin(t * (happy ? WAG.happyRate : WAG.idleRate)) * (happy ? WAG.happy : WAG.idle))
    }
  })

  return <primitive object={rig.root} />
}
