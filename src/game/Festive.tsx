import { holiday } from './calendar'
import { FRONT_DOOR } from './world/layout'

// Decorations by the front door on a few days of the year (calendar.ts): pumpkins at Halloween,
// presents at Christmas, balloons on the island's birthday. A handful of plain shapes, only drawn
// on those days, with nothing to bump into.

const BESIDE = 1.4 // how far either side of the door they stand
const OUT = 0.9 // and how far out in front of the wall

function Pumpkin({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position-y={0.17} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshLambertMaterial color="#e07a26" flatShading />
      </mesh>
      <mesh position-y={0.36}>
        <cylinderGeometry args={[0.025, 0.035, 0.1, 5]} />
        <meshLambertMaterial color="#4f6b2c" />
      </mesh>
    </group>
  )
}

function Present({ x, z, color, s }: { x: number; z: number; color: string; s: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position-y={0.14}>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* ribbons, both ways round */}
      <mesh position-y={0.14}>
        <boxGeometry args={[0.3, 0.29, 0.06]} />
        <meshLambertMaterial color="#f4e3a1" />
      </mesh>
      <mesh position-y={0.14}>
        <boxGeometry args={[0.06, 0.29, 0.3]} />
        <meshLambertMaterial color="#f4e3a1" />
      </mesh>
    </group>
  )
}

function Balloon({ x, z, color, h }: { x: number; z: number; color: string; h: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={h / 2}>
        <cylinderGeometry args={[0.006, 0.006, h, 3]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh position-y={h + 0.16} scale={[1, 1.2, 1]}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  )
}

export function Festive() {
  const x = FRONT_DOOR.x
  const z = FRONT_DOOR.z + OUT
  if (holiday === 'halloween')
    return (
      <>
        <Pumpkin x={x - BESIDE} z={z} s={1.1} />
        <Pumpkin x={x - BESIDE - 0.4} z={z + 0.25} s={0.75} />
        <Pumpkin x={x + BESIDE} z={z} s={0.9} />
      </>
    )
  if (holiday === 'christmas')
    return (
      <>
        <Present x={x - BESIDE} z={z} color="#c73b3b" s={1.1} />
        <Present x={x - BESIDE - 0.35} z={z + 0.2} color="#3b7d52" s={0.8} />
        <Present x={x + BESIDE} z={z} color="#3b5fa8" s={1} />
      </>
    )
  if (holiday === 'birthday')
    return (
      <>
        <Balloon x={x - BESIDE} z={z} color="#e0566a" h={1.3} />
        <Balloon x={x - BESIDE - 0.25} z={z + 0.1} color="#f2b233" h={1.1} />
        <Balloon x={x + BESIDE} z={z} color="#5b9bd5" h={1.25} />
      </>
    )
  return null
}
