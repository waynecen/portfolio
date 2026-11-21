import { useEffect } from 'react'
import { addCollider } from '../core/collision'
import { register, say } from '../core/interact'
import { NOTICE_AT } from './layout'
import { noticeLines } from './notice'

// The notice board on the city square, by the shop: two posts, a wide board and a few pinned papers. Reading
// it pins up a different notice each time, chosen from what's going on (notice.ts).

const WOOD = '#a0724a'
const BOARD = '#c99a68'
const PAPERS = [
  { x: -0.25, y: 0.86, w: 0.24, h: 0.28, c: '#f4efe2' },
  { x: 0.06, y: 0.9, w: 0.2, h: 0.22, c: '#f2dd9a' },
  { x: 0.3, y: 0.82, w: 0.18, h: 0.24, c: '#f4efe2' },
]

export function NoticeBoard() {
  const { x, z } = NOTICE_AT
  useEffect(() => register({ x, z, range: 1.4, prompt: 'Read', onInteract: () => say(noticeLines()) }), [x, z])
  useEffect(() => addCollider({ kind: 'box', x, z, hx: 0.6, hz: 0.12 }), [x, z])
  return (
    <group position={[x, 0, z]}>
      {[-0.5, 0.5].map((px) => (
        <mesh key={px} position={[px, 0.5, 0]}>
          <boxGeometry args={[0.09, 1, 0.09]} />
          <meshLambertMaterial color={WOOD} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.1, 0.55, 0.06]} />
        <meshLambertMaterial color={BOARD} />
      </mesh>
      {/* a little roof over it */}
      <mesh position={[0, 1.16, 0]}>
        <boxGeometry args={[1.25, 0.06, 0.2]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      {PAPERS.map((p, k) => (
        <mesh key={k} position={[p.x, p.y, 0.035]}>
          <planeGeometry args={[p.w, p.h]} />
          <meshLambertMaterial color={p.c} />
        </mesh>
      ))}
    </group>
  )
}
