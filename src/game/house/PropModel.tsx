import { useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import { lambertAll, useGLB } from '../core/gltf'
import { useSceneFrame } from '../core/sceneFrame'
import type { Scene } from '../core/store'
import { sky } from '../world/sky'

// A Tripo prop for the room, or outdoors with `scene` (models-src, through npm run models): fitted to `width` across, standing
// on the floor and centred on its spot (offset by `z`). With `depth`, it's also stretched or squeezed
// front to back to fill its tiles, which a bed or a rug can take without looking wrong, and with
// `height` made taller or lower the same way. Loaded lazily;
// whoever shows it keeps the placeholder blocks up until it's here. Each one shows its own copy of the
// loaded scene (sharing its geometry and textures), so one file can be several pieces (the pots, once they have one).

// A soft studio fill (lambertAll), so it keeps the warm, bright look of its Tripo preview: the room's
// key light comes from above and to the side, which leaves fronts near black. Less at night, so it
// doesn't glow in a lamp-lit room. Kept low: the textures already have soft lighting painted in.
const FILL = { day: 0.2, night: 0.12 }

type Props = { url: string; width: number; depth?: number; height?: number; z?: number; scene?: Scene }

export default function PropModel({ url, width, depth, height, z = 0, scene = 'house' }: Props) {
  const gltf = useGLB(url)
  const { root, materials } = useMemo(() => {
    const root = gltf.scene.clone()
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const s = width / (size.x || 1)
    const sy = height ? height / (size.y || 1) : s
    const sz = depth ? depth / (size.z || 1) : s
    root.scale.set(s, sy, sz)
    root.position.set(-centre.x * s, -box.min.y * sy, -centre.z * sz + z)
    return { root, materials: lambertAll(root) }
  }, [gltf, width, depth, height, z])

  useSceneFrame(scene, () => {
    const fill = FILL.day + (FILL.night - FILL.day) * sky.weather.night
    for (const m of materials) m.emissiveIntensity = fill
  })

  return <primitive object={root} />
}
