import { useEffect } from 'react'
import { BoxGeometry, ConeGeometry, CylinderGeometry, MeshLambertMaterial } from 'three'
import { addCollider } from './core/collision'
import { register, say } from './core/interact'
import { signposts, type Signpost, type Way } from './pois'

// The signposts at the crossroads (pois.ts works out where, and which way each place is). A post
// with an arrow board for every way it points; reading it names the places that lie each way.

const ARROW: Record<Way, string> = { n: '↑', e: '→', s: '↓', w: '←' }
const TURN: Record<Way, number> = { e: 0, n: Math.PI / 2, w: Math.PI, s: -Math.PI / 2 } // a board points along +x before turning

const postGeometry = new CylinderGeometry(0.05, 0.06, 1.15, 6).translate(0, 0.575, 0)
const boardGeometry = new BoxGeometry(0.42, 0.13, 0.05).translate(0.24, 0, 0)
const tipGeometry = new ConeGeometry(0.09, 0.12, 3).rotateZ(-Math.PI / 2).translate(0.51, 0, 0)
const post = new MeshLambertMaterial({ color: '#8a5f3c', flatShading: true })
const board = new MeshLambertMaterial({ color: '#d4a874', flatShading: true })

/** The words on `s`: one line per way, e.g. "→ Home, Contact". */
const signLines = (s: Signpost) => s.ways.map((w) => `${ARROW[w.way]}  ${w.places.join(', ')}`)

function Post({ s }: { s: Signpost }) {
  useEffect(() => register({ x: s.x, z: s.z, range: 1.2, prompt: 'Read', onInteract: () => say(signLines(s)) }), [s])
  useEffect(() => addCollider({ kind: 'circle', x: s.x, z: s.z, r: 0.12 }), [s])
  return (
    <group position={[s.x, 0, s.z]}>
      <mesh geometry={postGeometry} material={post} />
      {s.ways.map((w, k) => (
        <group key={w.way} position-y={1 - k * 0.17} rotation-y={TURN[w.way]}>
          <mesh geometry={boardGeometry} material={board} />
          <mesh geometry={tipGeometry} material={board} />
        </group>
      ))}
    </group>
  )
}

export function Signposts() {
  return (
    <>
      {signposts.map((s) => (
        <Post key={`${s.x},${s.z}`} s={s} />
      ))}
    </>
  )
}
