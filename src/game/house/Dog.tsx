import { lazy, Suspense, useEffect, useRef } from 'react'
import { Color, ConeGeometry, MeshBasicMaterial, MeshLambertMaterial, SphereGeometry, TorusGeometry, type Group } from 'three'
import { addCollider, type Collider } from '../core/collision'
import { block, merge, tint } from '../core/geometry'
import { register, type Interactable } from '../core/interact'
import { reducedMotion } from '../core/settings'
import { useSceneFrame } from '../core/sceneFrame'
import { useGame } from '../core/store'
import { Held } from '../core/Held'
import { dog, pet, RADIUS, RANGE, tickDog } from './shiba'

const ShibaModel = lazy(() => import('./ShibaModel'))

// Kinako, the house shiba (its wandering and petting are shiba.ts): the Tripo model (ShibaModel.tsx),
// with these blocks standing in while it loads: a tan body with a cream chest, muzzle and belly,
// pointed ears, a curled tail that wags, and legs that trot. Facing +z at heading 0.

const TAN = new Color('#d98a43')
const CREAM = new Color('#f4e4c8')
const BLACK = new Color('#1f1a17')

const body = merge([
  tint(block(-0.14, 0.14, 0.18, 0.38, -0.26, 0.2), TAN), // the body
  tint(block(-0.12, 0.12, 0.15, 0.2, -0.22, 0.18), CREAM), // the belly
  tint(block(-0.1, 0.1, 0.22, 0.36, 0.2, 0.24), CREAM), // the chest
  tint(block(-0.12, 0.12, 0.36, 0.58, 0.12, 0.36), TAN), // the head
  tint(block(-0.065, 0.065, 0.37, 0.47, 0.36, 0.46), CREAM), // the muzzle
  tint(block(-0.025, 0.025, 0.44, 0.48, 0.46, 0.48), BLACK), // the nose
  ...[-1, 1].flatMap((s) => [
    tint(block(s * 0.06 - 0.018, s * 0.06 + 0.018, 0.5, 0.535, 0.36, 0.37), BLACK), // an eye
    tint(new ConeGeometry(0.055, 0.12, 4).rotateY(Math.PI / 4).translate(s * 0.075, 0.64, 0.22), TAN), // an ear
  ]),
])
const leg = merge([tint(block(-0.035, 0.035, -0.2, -0.04, -0.035, 0.035), TAN), tint(block(-0.037, 0.037, -0.2, -0.17, -0.037, 0.04), CREAM)]) // hangs from its hip at y 0
const LEGS = [
  [-0.09, 0.12],
  [0.09, 0.12],
  [-0.09, -0.18],
  [0.09, -0.18],
] as const
const tail = merge([tint(new TorusGeometry(0.07, 0.03, 6, 10, Math.PI * 1.6).rotateY(Math.PI / 2).translate(0, 0.07, 0), TAN)])
const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true })

// Hearts after a pet: two balls and a point, rising and fading.
const heart = merge([
  new SphereGeometry(0.045, 8, 6).translate(-0.035, 0, 0),
  new SphereGeometry(0.045, 8, 6).translate(0.035, 0, 0),
  new ConeGeometry(0.066, 0.09, 8).rotateZ(Math.PI).translate(0, -0.05, 0),
])
const HEARTS = [
  { x: -0.12, delay: 0 },
  { x: 0.1, delay: 0.25 },
  { x: 0, delay: 0.5 },
]
const HEART_TIME = 1.2 // seconds each heart takes to rise and fade
const heartMaterials = HEARTS.map(() => new MeshBasicMaterial({ color: '#ff6f8e', transparent: true, depthWrite: false }))

/** Kinako, in the room (Game.tsx mounts it in the house's group). */
export function Dog() {
  const root = useRef<Group>(null)
  const pose = useRef<Group>(null)
  const legs = useRef<(Group | null)[]>([])
  const wag = useRef<Group>(null)
  const hearts = useRef<(Group | null)[]>([])
  const shown = useRef(0)

  const collider = useRef<Collider & { kind: 'circle' }>({ kind: 'circle', x: dog.x, z: dog.z, r: RADIUS })
  const item = useRef<Interactable>({ x: dog.x, z: dog.z, range: RANGE, prompt: 'Pet', onInteract: pet })
  useEffect(() => {
    const removers = [addCollider(collider.current), register(item.current)]
    return () => removers.forEach((r) => r())
  }, [])

  useSceneFrame('house', ({ clock }, delta) => {
    const s = useGame.getState()
    const dt = Math.min(delta, 0.1)
    if (!s.editing && !s.panel && !s.fading) tickDog(dt)
    collider.current.x = item.current.x = dog.x
    collider.current.z = item.current.z = dog.z
    const g = root.current
    if (!g) return
    const t = clock.elapsedTime
    const still = reducedMotion()
    g.position.set(dog.x, 0, dog.z)
    // Turn the short way round, smoothly.
    const turn = Math.atan2(Math.sin(dog.heading - shown.current), Math.cos(dog.heading - shown.current))
    shown.current += turn * (1 - Math.exp(-10 * dt))
    g.rotation.y = shown.current
    // Sitting tips it back on its haunches; trotting swings the legs in diagonal pairs.
    if (pose.current) pose.current.rotation.x += ((dog.sit > 0 ? -0.45 : 0) - pose.current.rotation.x) * (1 - Math.exp(-8 * dt))
    const swing = dog.moving && !still ? Math.sin(t * dog.speed * 14) * 0.55 : 0
    legs.current.forEach((l, k) => l && (l.rotation.x = k === 0 || k === 3 ? swing : -swing))
    if (wag.current) wag.current.rotation.z = still ? 0 : Math.sin(t * (dog.sit > 0 ? 22 : 7)) * (dog.sit > 0 ? 0.5 : 0.2)
    // The hearts.
    hearts.current.forEach((h, k) => {
      if (!h) return
      const a = (dog.hearts - HEARTS[k].delay) / HEART_TIME
      h.visible = dog.hearts >= 0 && a > 0 && a < 1
      if (!h.visible) return
      h.position.y = 0.75 + a * 0.45
      h.rotation.y = -shown.current // keep facing the camera
      heartMaterials[k].opacity = a < 0.2 ? a / 0.2 : 1 - (a - 0.2) / 0.8
    })
  })

  return (
    <group ref={root}>
      {/* Pivots on its back legs to sit. */}
      <group position-z={-0.2}>
        <group ref={pose}>
          <group position-z={0.2}>
            <Suspense
              fallback={
                <Held>
                  <mesh geometry={body} material={material} />
                  {LEGS.map(([x, z], k) => (
                    <group
                      key={k}
                      position={[x, 0.2, z]}
                      ref={(el) => {
                        legs.current[k] = el
                      }}
                    >
                      <mesh geometry={leg} material={material} />
                    </group>
                  ))}
                  <group ref={wag} position={[0, 0.36, -0.26]}>
                    <mesh geometry={tail} material={material} />
                  </group>
                </Held>
              }
            >
              <ShibaModel />
            </Suspense>
          </group>
        </group>
      </group>
      {HEARTS.map((h, k) => (
        <group
          key={k}
          position-x={h.x}
          visible={false}
          ref={(el) => {
            hearts.current[k] = el
          }}
          userData={{ noShadow: true }}
        >
          <mesh geometry={heart} material={heartMaterials[k]} />
        </group>
      ))}
    </group>
  )
}
