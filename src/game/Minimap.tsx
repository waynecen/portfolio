import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { pois, roads, type PoiKind } from './pois'
import { playerFacing, playerPos } from './state'

// The SVG uses world units directly: x → x, z → y (toward the camera = down on the map).
const MARGIN = 5
const minX = Math.min(...pois.map((p) => p.x)) - MARGIN
const maxX = Math.max(...pois.map((p) => p.x)) + MARGIN
const minZ = Math.min(...pois.map((p) => p.z)) - MARGIN
const maxZ = Math.max(...pois.map((p) => p.z)) + MARGIN
const INSET = 1.2 // keep the player arrow this far inside the edge when they wander off the map

const roadPaths = roads.map((r) => 'M' + r.map((p) => `${p.x.toFixed(2)} ${p.z.toFixed(2)}`).join('L'))
const summary = 'Map: ' + pois.map((p) => p.label).join(', ')

// The arrow's two transforms, created once by <Minimap> and updated in place by <MinimapTracker>.
const marker: { move: SVGTransform | null; turn: SVGTransform | null } = { move: null, turn: null }

function Icon({ kind }: { kind: PoiKind }) {
  switch (kind) {
    case 'home':
      return <path className="map-home" d="M-1.1 .2L0-1 1.1 .2V1H-1.1Z" />
    case 'project':
      return <path className="map-project" d="M0-1.2L1 0 0 1.2-1 0Z" />
    case 'music':
      return (
        <g className="map-music">
          <circle r="1.25" />
          <path d="M-.1 .55V-.75L.6-.55" fill="none" strokeWidth=".22" />
          <circle cx="-.35" cy=".55" r=".3" />
        </g>
      )
  }
}

/** Top-right map of the points of interest and their roads, with the player's position and heading. */
export function Minimap() {
  const arrow = useRef<SVGGElement>(null)

  useEffect(() => {
    const el = arrow.current
    const svg = el?.ownerSVGElement
    if (!el || !svg) return
    marker.move = svg.createSVGTransform()
    marker.turn = svg.createSVGTransform()
    el.transform.baseVal.appendItem(marker.move)
    el.transform.baseVal.appendItem(marker.turn)
    return () => {
      marker.move = marker.turn = null
    }
  }, [])

  return (
    <svg className="minimap" viewBox={`${minX} ${minZ} ${maxX - minX} ${maxZ - minZ}`} role="img" aria-label={summary}>
      <rect className="map-ground" x={minX} y={minZ} width={maxX - minX} height={maxZ - minZ} />
      {roadPaths.map((d, i) => (
        <path key={i} className="map-road" d={d} />
      ))}
      {pois.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.z})`}>
          <title>{p.label}</title>
          <Icon kind={p.kind} />
        </g>
      ))}
      <g ref={arrow} className="map-player">
        <path d="M0 1.3L.9-.8 0-.3-.9-.8Z" />
      </g>
    </svg>
  )
}

/** Lives inside the Canvas so the arrow follows the player each frame without React renders. */
export function MinimapTracker() {
  useFrame(() => {
    if (!marker.move || !marker.turn) return
    const x = Math.min(maxX - INSET, Math.max(minX + INSET, playerPos.x))
    const z = Math.min(maxZ - INSET, Math.max(minZ + INSET, playerPos.z))
    marker.move.setTranslate(x, z)
    // Heading 0 faces +z (down the map); SVG rotation is clockwise in degrees.
    marker.turn.setRotate((-playerFacing.heading * 180) / Math.PI, 0, 0)
  })
  return null
}
