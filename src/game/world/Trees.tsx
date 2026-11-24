import { useEffect, useLayoutEffect, useRef } from 'react'
import { Color, ConeGeometry, CylinderGeometry, MeshLambertMaterial, Object3D, Vector2, type InstancedMesh } from 'three'
import { addCollider } from '../core/collision'
import { TILE } from '../core/grid'
import { ISLET } from './land'
import { trees, type Tree } from './forest'
import { autumn, spring, winter } from './season'
import { playerPos } from '../core/state'
import { useSceneFrame } from '../core/sceneFrame'
import { sway, type Sway } from '../core/wind'

// Placeholder trees: a trunk and a low-poly cone, drawn as instanced meshes (a draw call or two
// for every tree on the island). Where they stand is forest.ts.
// A tree between the camera and the player thins out, so the player never disappears behind one.

const TRUNK_RADIUS = 0.25 // collision radius at scale 1; a little wider than the trunk so the pill doesn't clip the canopy
const MAX_TRUNK = 0.3 // and at most this, so the pill (0.35 radius) still fits between forest trees corner to corner
const FADE = 0.75 // how much of a tree in front of the player drops out (0 = none, 1 = all of it)

// The islet's few trees, placed by hand (it lies past where trees scatter themselves). Kept out of
// `trees` so nothing that hides beside a tree (pearls.ts) goes looking out there.
const ISLET_TREES: Tree[] = [
  { x: ISLET.x - 3, z: ISLET.z - 1, scale: 1.1, turn: 0.4 },
  { x: ISLET.x + 3, z: ISLET.z, scale: 0.9, turn: 2.1 },
  { x: ISLET.x - 1, z: ISLET.z + 3, scale: 1.25, turn: 4 },
]
const drawn = [...trees, ...ISLET_TREES]

// See-through: each tree works out in its vertex shader how far it stands in front of the player
// (toward the camera, and to the side), and its pixels drop out in a fine, fixed noise pattern in
// proportion. Cheaper than sorting transparent trees, and nothing is allocated per frame.
const player = { value: new Vector2() }
function seeThrough(m: MeshLambertMaterial) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uPlayer = player
    shader.vertexShader =
      'uniform vec2 uPlayer;\nvarying float vFade;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
  vec2 toTree = instanceMatrix[3].xz - uPlayer;
  vFade = ${FADE.toFixed(3)} * (1.0 - smoothstep(0.7, 1.4, abs(toTree.x))) * smoothstep(-0.2, 0.4, toTree.y) * (1.0 - smoothstep(2.4, 3.4, toTree.y));`,
      )
    shader.fragmentShader =
      'varying float vFade;\n' +
      shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
  if (vFade > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;`,
      )
  }
  return m
}

const trunkGeometry = new CylinderGeometry(0.08, 0.12, 0.5, 6).translate(0, 0.25, 0)
const canopyGeometry = new ConeGeometry(0.5, 1.2, 7).translate(0, 1.05, 0)
// Trunk, canopy and snow cap share one bend, so they sway together (core/wind.ts).
const SWAY: Sway = { height: 1.65, amount: 0.07 }
const trunkMaterial = sway(seeThrough(new MeshLambertMaterial({ color: '#8a5a3b', flatShading: true })), SWAY)
// White, so each tree's own colour shows (canopyColor): green, blossom in spring, turning in autumn.
const canopyMaterial = sway(seeThrough(new MeshLambertMaterial({ color: '#ffffff', flatShading: true })), SWAY)
const GREEN = new Color('#3f7d4a')
const SPRING_GREEN = new Color('#4f9a55')
const BLOSSOM = [new Color('#f0a9c0'), new Color('#f6c6d4')]
const BLOSSOMING = 0.35 // share of trees in blossom in spring
const AUTUMN = ['#d9873a', '#c4632f', '#e3b04b', '#b5452f', '#8a9a3a'].map((c) => new Color(c))
/** Tree n's canopy colour this season, fixed per tree so it's the same on every visit. */
function canopyColor(n: number): Color {
  const h = ((n * 2654435761) >>> 0) / 4294967296 // a fixed, spread-out number in [0, 1) per tree
  if (spring) return h < BLOSSOMING ? BLOSSOM[n % 2] : SPRING_GREEN
  if (autumn) return AUTUMN[Math.floor(h * AUTUMN.length)]
  return GREEN
}
// Winter: a white cone over the canopy's top half, a little wider so no green shows through its rim.
const capGeometry = new ConeGeometry(0.25, 0.56, 7).translate(0, 1.37, 0)
const capMaterial = sway(seeThrough(new MeshLambertMaterial({ color: '#f4f7fb', flatShading: true })), SWAY)

export function Trees() {
  const trunks = useRef<InstancedMesh>(null)
  const canopies = useRef<InstancedMesh>(null)
  const caps = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const dummy = new Object3D()
    drawn.forEach((t, n) => {
      dummy.position.set(t.x, 0, t.z)
      dummy.rotation.y = t.turn
      dummy.scale.setScalar(t.scale)
      dummy.updateMatrix()
      trunks.current?.setMatrixAt(n, dummy.matrix)
      canopies.current?.setMatrixAt(n, dummy.matrix)
      canopies.current?.setColorAt(n, canopyColor(n))
      caps.current?.setMatrixAt(n, dummy.matrix)
    })
    for (const mesh of [trunks.current, canopies.current, caps.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere() // cover every instance, so the forest isn't culled when the origin is off screen
    }
  }, [])

  useEffect(() => {
    const removers = drawn.map((t) => addCollider({ kind: 'circle', x: t.x, z: t.z, r: Math.min(MAX_TRUNK, TRUNK_RADIUS * t.scale) }))
    return () => removers.forEach((remove) => remove())
  }, [])

  useSceneFrame('world', () => {
    player.value.set(playerPos.x, playerPos.z)
  })

  return (
    <>
      <instancedMesh ref={trunks} args={[trunkGeometry, trunkMaterial, drawn.length]} />
      <instancedMesh ref={canopies} args={[canopyGeometry, canopyMaterial, drawn.length]} />
      {winter && <instancedMesh ref={caps} args={[capGeometry, capMaterial, drawn.length]} />}
    </>
  )
}
