import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { BoxGeometry, DoubleSide, MeshBasicMaterial, MeshLambertMaterial, RingGeometry, type Group, type Mesh } from 'three'
import { CHARGE, SPIN_TIME, SWING_TIME, sword, updateSword } from './combat'
import { reducedMotion } from './settings'
import { playerFacing } from './state'

// The sword in the player's hand (combat.ts has the rules): out only while swinging, spinning or
// charging. A swing sweeps it from the right side to the left across the front, leaving a pale arc;
// a spin carries it all the way round. Charged, the blade glows. Mounted in <Player>'s root, so it
// turns with the character but stays out of the roll's tumble.

const LENGTH = 0.55
const HAND_Y = 0.5 // height of the blade
const HAND_OUT = 0.18 // how far from the body's centre the hilt is held
const SWEEP = 1.9 // a swing sweeps this far (radians), centred on the way the player faces

const blade = new BoxGeometry(0.06, 0.03, LENGTH).translate(0, 0, HAND_OUT + 0.12 + LENGTH / 2)
const hilt = new BoxGeometry(0.2, 0.04, 0.05).translate(0, 0, HAND_OUT + 0.1)
const bladeMaterial = new MeshLambertMaterial({ color: '#dfe6ee', emissive: '#fff3b0', emissiveIntensity: 0 })
const hiltMaterial = new MeshLambertMaterial({ color: '#8a5a3b' })
// The trail: a flat ring segment at the blade's height, fading as the swing ends.
// (A ring segment is centred on +x; turned a quarter round, it sits in front, on +z.)
const trailGeometry = new RingGeometry(HAND_OUT + 0.25, HAND_OUT + 0.12 + LENGTH, 24, 1, -SWEEP / 2, SWEEP)
  .rotateX(-Math.PI / 2)
  .rotateY(-Math.PI / 2)
const spinGeometry = new RingGeometry(HAND_OUT + 0.25, HAND_OUT + 0.12 + LENGTH + 0.3, 40).rotateX(-Math.PI / 2)
const trailMaterial = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide })

export function Sword() {
  const turn = useRef<Group>(null)
  const swing = useRef<Group>(null)
  const trail = useRef<Mesh>(null)
  const spin = useRef<Mesh>(null)

  useFrame(({ clock }, delta) => {
    updateSword(Math.min(delta, 0.1))
    const g = turn.current
    const s = swing.current
    if (!g || !s || !trail.current || !spin.current) return
    const out = sword.t >= 0 || sword.holding
    g.visible = out
    trail.current.visible = false
    spin.current.visible = false
    if (!out) return
    g.rotation.y = playerFacing.heading
    if (sword.t >= 0 && sword.spin) {
      // A spin: the blade goes all the way round, with a full ring of trail.
      const k = Math.min(1, sword.t / SPIN_TIME)
      s.rotation.y = -Math.PI * 2 * (1 - (1 - k) ** 2)
      spin.current.visible = !reducedMotion()
      trailMaterial.opacity = 0.55 * (1 - k)
    } else if (sword.t >= 0) {
      // A swing: from the right (seen from behind the character) across to the left, easing out.
      const k = Math.min(1, sword.t / SWING_TIME)
      s.rotation.y = -SWEEP / 2 + SWEEP * (1 - (1 - k) ** 3)
      trail.current.visible = !reducedMotion()
      trailMaterial.opacity = 0.5 * (1 - k)
    } else {
      // Holding after a swing: the blade held out in front, glowing once a spin is ready.
      s.rotation.y = SWEEP / 2
    }
    const ready = sword.holding && sword.charge >= CHARGE
    bladeMaterial.emissiveIntensity = ready ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 18) : 0
  })

  return (
    <group ref={turn} visible={false}>
      <group ref={swing} position-y={HAND_Y}>
        <mesh geometry={blade} material={bladeMaterial} />
        <mesh geometry={hilt} material={hiltMaterial} />
      </group>
      <mesh ref={trail} geometry={trailGeometry} material={trailMaterial} position-y={HAND_Y} visible={false} />
      <mesh ref={spin} geometry={spinGeometry} material={trailMaterial} position-y={HAND_Y} visible={false} />
    </group>
  )
}
