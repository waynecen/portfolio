import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, MeshBasicMaterial, Plane, PlaneGeometry, Raycaster, Vector2, Vector3, type BufferGeometry, type Group, type Mesh } from 'three'
import { holdOver, pickUp, putBack, putDown, stopEdit, toggleEdit, useEdit } from './edit'
import { inRoom, PIECE, pieceAt, resetRoom, TILES, useRoom, type Spot } from './room'
import { flat, merge } from './core/geometry'
import { INTERIOR } from './layout'
import { isTouch } from './core/quality'
import { useGame } from './core/store'
import { keyName } from './core/keymap'

// What edit mode shows: in the room, the tile grid and a highlight on the tiles the cursor or
// the piece in hand covers; on screen, the button that starts it and the bar that ends it.
// Dragging with a mouse or finger is read here too, by finding the floor tile under the pointer.

const OK = new Color('#7ad37a') // the piece in hand fits here
const NO = new Color('#e2574c') // it doesn't
const AIM = new Color('#ffffff') // the cursor, over nothing
const OVER = new Color('#f2b233') // the cursor, over a piece you could pick up

const LINE = 0.04 // grid line width

// A thin strip along every tile edge, a hair above the floor (house-local). Strips rather than
// lines, which are a single pixel wide and vanish into the planks' seams.
function buildGrid() {
  const parts: BufferGeometry[] = []
  const x0 = TILES.i0 - 0.5
  const x1 = TILES.i1 + 0.5
  const z0 = TILES.j0 - 0.5
  const z1 = TILES.j1 + 0.5
  for (let x = x0; x <= x1; x++) parts.push(flat(x - LINE / 2, x + LINE / 2, z0, z1, 0.02))
  for (let z = z0; z <= z1; z++) parts.push(flat(x0, x1, z - LINE / 2, z + LINE / 2, 0.02))
  return merge(parts)
}
const grid = buildGrid()
const overlay = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }
const gridMaterial = new MeshBasicMaterial({ ...overlay, color: '#fffaf0', opacity: 0.55 })
const square = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
const squareMaterial = new MeshBasicMaterial({ ...overlay, opacity: 0.7 })

/** The grid and highlight, in the room. */
export function EditOverlay() {
  const group = useRef<Group>(null)
  const mark = useRef<Mesh>(null)
  useFrame(() => {
    const g = group.current
    const m = mark.current
    if (!g || !m) return
    g.visible = useGame.getState().editing
    if (!g.visible) return
    const { cursor, held } = useEdit.getState()
    const p = held ? PIECE[held.id] : pieceAt(cursor)
    const at = held ? held.at : p ? useRoom.getState().spots[p.id] : cursor
    const w = p ? p.w : 1
    const d = p ? p.d : 1
    m.position.set(INTERIOR.x + at.i + (w - 1) / 2, 0.025, INTERIOR.z + at.j + (d - 1) / 2)
    m.scale.set(w - 0.04, 1, d - 0.04)
    squareMaterial.color.copy(held ? (held.problem ? NO : OK) : p ? OVER : AIM)
  })
  return (
    <group ref={group} visible={false}>
      <mesh geometry={grid} material={gridMaterial} position={[INTERIOR.x, 0, INTERIOR.z]} />
      <mesh ref={mark} geometry={square} material={squareMaterial} />
    </group>
  )
}

/** Drag furniture with a mouse or finger while editing. Inside the Canvas. */
export function EditPointer() {
  const { gl, camera } = useThree()
  const editing = useGame((s) => s.editing)

  useEffect(() => {
    if (!editing) return
    const el = gl.domElement
    const ray = new Raycaster()
    const ndc = new Vector2()
    const hit = new Vector3()
    const floor = new Plane(new Vector3(0, 1, 0), 0)
    let dragging: number | null = null

    // The room tile under the pointer, or null off the floor.
    const tileUnder = (e: PointerEvent): Spot | null => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      if (!ray.ray.intersectPlane(floor, hit)) return null
      const t = { i: Math.round(hit.x - INTERIOR.x), j: Math.round(hit.z - INTERIOR.z) }
      return inRoom(t) ? t : null
    }

    const down = (e: PointerEvent) => {
      const t = tileUnder(e)
      if (!t) return
      if (useEdit.getState().held) {
        // Picked up with the keys: a click puts it down here.
        holdOver(t)
        putDown()
      } else if (pickUp(t, true)) {
        dragging = e.pointerId
        el.setPointerCapture(e.pointerId)
      } else useEdit.setState({ cursor: t })
    }
    const move = (e: PointerEvent) => {
      const t = tileUnder(e)
      if (!t) return
      if (e.pointerId === dragging || useEdit.getState().held) holdOver(t)
      else if (e.pointerType === 'mouse') useEdit.setState({ cursor: t })
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return
      dragging = null
      if (!putDown()) putBack() // didn't fit: back where it was
    }
    const cancel = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return
      dragging = null
      putBack()
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    el.style.cursor = 'pointer'
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
      el.style.cursor = ''
    }
  }, [editing, gl, camera])
  return null
}

/** "Edit room" indoors, and while editing, what to do and how to finish. */
export function EditHud() {
  const scene = useGame((s) => s.scene)
  const editing = useGame((s) => s.editing)
  const busy = useGame((s) => s.dialogue !== null || s.panel !== null || s.fading)
  const held = useEdit((s) => s.held)

  useEffect(() => {
    document.body.classList.toggle('editing', editing) // hides the touch controls (style.css)
    return () => document.body.classList.remove('editing')
  }, [editing])

  if (scene !== 'house' || (busy && !editing)) return null
  if (!editing) {
    return (
      <button type="button" className="edit-toggle" onClick={toggleEdit}>
        {!isTouch && <kbd>{keyName('edit')}</kbd>} Edit room
      </button>
    )
  }
  const hint = held
    ? held.problem ?? (held.dragged ? 'Let go to put it down.' : 'Arrows to move, E to put it down, Esc to put it back.')
    : isTouch
      ? 'Drag a piece of furniture to move it.'
      : 'Drag furniture, or use the arrows and E to pick it up.'
  return (
    <div className="edit-bar" role="region" aria-label="Edit room">
      <p className="edit-title">{held ? `Moving ${PIECE[held.id].name}` : 'Editing the room'}</p>
      <p className="edit-hint" aria-live="polite">{hint}</p>
      <div className="edit-actions">
        <button type="button" onClick={resetRoom} disabled={held !== null}>
          Reset
        </button>
        <button type="button" className="edit-done" onClick={stopEdit}>
          {!isTouch && <kbd>{keyName('edit')}</kbd>} Done
        </button>
      </div>
    </div>
  )
}
