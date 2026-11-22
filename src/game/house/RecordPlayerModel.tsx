import { useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import { lambertAll, useGLB } from '../core/gltf'
import { useSceneFrame } from '../core/sceneFrame'
import { sky } from '../world/sky'

// The record player's Tripo model (models-src, through npm run models), fitted to `width`, standing
// on the floor and centred on its spot. Loaded lazily by RecordPlayer.tsx, which shows the box
// cabinet until it's here.

// A soft studio fill (lambertAll), so it keeps the warm, bright look of its Tripo preview: the room's
// key light comes from above and to the side, which left the front and its speaker near black. Less
// at night, so it doesn't glow in a lamp-lit room.
// Kept low: the model's texture already has soft lighting painted in.
const FILL = { day: 0.2, night: 0.12 }

export default function RecordPlayerModel({ url, width }: { url: string; width: number }) {
  const gltf = useGLB(url)
  const { root, materials } = useMemo(() => {
    const root = gltf.scene
    root.scale.setScalar(1)
    root.position.set(0, 0, 0)
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const s = width / (size.x || 1)
    root.scale.setScalar(s)
    root.position.set(-centre.x * s, -box.min.y * s, -centre.z * s)
    return { root, materials: lambertAll(root) }
  }, [gltf, width])

  useSceneFrame('house', () => {
    const fill = FILL.day + (FILL.night - FILL.day) * sky.weather.night
    for (const m of materials) m.emissiveIntensity = fill
  })

  return <primitive object={root} />
}
