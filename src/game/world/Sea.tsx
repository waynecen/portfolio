import { useMemo } from 'react'
import { Color, DataTexture, LinearFilter, MeshLambertMaterial, RedFormat, UnsignedByteType } from 'three'
import { useSceneFrame } from '../core/sceneFrame'
import { reducedMotion } from '../core/settings'
import { DOCK } from '../life/fishing'
import { isLand, WATER_Y } from './Island'
import { ISLET_BOAT } from './layout'
import { sky } from './sky'

// The sea: one big plane with its own look, patched onto a Lambert material so it keeps the island's
// lighting, shadows, curve and fog.
//
// - Shore foam: a solid line where water meets cliff, and wave lines rolling in toward the shore,
//   following the real coastline. It reads a distance-to-land map baked once at load (SHORE), in
//   which the dock's posts and the moored boats count as land too, so they get foam rings.
// - Ripples: two slow wave trains tilt the surface's normal, so the light shifts across it.
// - Glints: the sun (or moon) catches the ripples in small sparkles, which the bloom picks up.
// With reduced motion the water holds still.

const SIZE = 400 // the plane's size; big enough that its edge is never seen
const SEGMENTS = 160 // squares across, so it bends with the curved world (curve.ts)
const PER_UNIT = 4 // distance map texels per world unit
const REACH = 3 // distances are stored up to this far from land, in units
const MARGIN = 4 // the map reaches this far past the outermost land
const FOAM_EDGE = 0.25 // the solid foam line's width at the shore
const WAVES = 1.8 // how far out the rolling wave lines reach
const WAVE_SPACING = 0.55 // between wave lines
const WAVE_SPEED = 0.6 // how fast they roll in, units/s
const RIPPLE = 0.12 // how much the ripples tilt the surface
const GLINT = { day: 2.4, night: 0.35 } // sparkle strength (the noise mask thins them out)
const GLINT_TIGHT = 140 // how small the sparkles are (a specular power)

// What else stands in the water, as rounded boxes [x, z, half-x, half-z]: the dock's posts and the
// two moored boats. The dock boat lies along z beside the dock (DOCK_BOAT in secrets/islet.ts).
const POST_XS = [DOCK.x - DOCK.half + 0.04, DOCK.x + DOCK.half - 0.04]
const POST_ZS = [17, 18.3, DOCK.z1 - 0.1] // POSTS in life/Dock.tsx
const OBSTACLES: [number, number, number, number][] = [
  ...POST_XS.flatMap((x) => POST_ZS.map((z) => [x, z, 0.09, 0.09] as [number, number, number, number])),
  [DOCK.x + DOCK.half + 0.55, 16.7, 0.32, 0.78],
  [ISLET_BOAT.x, ISLET_BOAT.z, 0.78, 0.32],
]

/** The distance-to-land map: land tiles (and OBSTACLES) are 0, water grows outward, capped at REACH. */
function shoreMap() {
  // The land's extent, from the tiles.
  let x0 = 0
  let x1 = 0
  let z0 = 0
  let z1 = 0
  for (let i = -60; i <= 60; i++)
    for (let j = -60; j <= 60; j++)
      if (isLand(i, j)) {
        x0 = Math.min(x0, i - 0.5)
        x1 = Math.max(x1, i + 0.5)
        z0 = Math.min(z0, j - 0.5)
        z1 = Math.max(z1, j + 0.5)
      }
  x0 -= MARGIN
  z0 -= MARGIN
  x1 += MARGIN
  z1 += MARGIN
  const w = Math.ceil((x1 - x0) * PER_UNIT)
  const h = Math.ceil((z1 - z0) * PER_UNIT)
  const far = 1e6
  const d = new Float32Array(w * h).fill(far)
  for (let v = 0; v < h; v++)
    for (let u = 0; u < w; u++) {
      const x = x0 + (u + 0.5) / PER_UNIT
      const z = z0 + (v + 0.5) / PER_UNIT
      let solid = isLand(Math.round(x), Math.round(z))
      for (const [ox, oz, hx, hz] of OBSTACLES) if (Math.abs(x - ox) < hx && Math.abs(z - oz) < hz) solid = true
      if (solid) d[v * w + u] = 0
    }
  // Two-pass chamfer distance (in texels), close enough to true distance for foam.
  const D = 1
  const DD = Math.SQRT2
  for (let v = 0; v < h; v++)
    for (let u = 0; u < w; u++) {
      let m = d[v * w + u]
      if (u > 0) m = Math.min(m, d[v * w + u - 1] + D)
      if (v > 0) {
        m = Math.min(m, d[(v - 1) * w + u] + D)
        if (u > 0) m = Math.min(m, d[(v - 1) * w + u - 1] + DD)
        if (u < w - 1) m = Math.min(m, d[(v - 1) * w + u + 1] + DD)
      }
      d[v * w + u] = m
    }
  for (let v = h - 1; v >= 0; v--)
    for (let u = w - 1; u >= 0; u--) {
      let m = d[v * w + u]
      if (u < w - 1) m = Math.min(m, d[v * w + u + 1] + D)
      if (v < h - 1) {
        m = Math.min(m, d[(v + 1) * w + u] + D)
        if (u < w - 1) m = Math.min(m, d[(v + 1) * w + u + 1] + DD)
        if (u > 0) m = Math.min(m, d[(v + 1) * w + u - 1] + DD)
      }
      d[v * w + u] = m
    }
  const bytes = new Uint8Array(w * h)
  for (let k = 0; k < w * h; k++) bytes[k] = Math.round(Math.min(1, d[k] / PER_UNIT / REACH) * 255)
  const texture = new DataTexture(bytes, w, h, RedFormat, UnsignedByteType)
  texture.unpackAlignment = 1 // rows of single bytes, any width
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return { texture, min: [x0, z0] as [number, number], size: [x1 - x0, z1 - z0] as [number, number] }
}

const f = (x: number) => x.toFixed(4)

function seaMaterial(color: Color) {
  const shore = shoreMap()
  const uniforms = {
    uSeaTime: { value: 0 },
    uShore: { value: shore.texture },
    uShoreMin: { value: shore.min },
    uShoreSize: { value: shore.size },
    uFoamColor: { value: new Color('#ffffff') },
    uGlint: { value: GLINT.day },
    uSunColor: { value: new Color() },
  }
  const m = new MeshLambertMaterial({ color })
  m.color = color // shared with waterMaterial, so Atmosphere.tsx's tint reaches the sea too
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader =
      'varying vec3 vSeaWorld;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSeaWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;')
    shader.fragmentShader =
      `varying vec3 vSeaWorld;
uniform float uSeaTime;
uniform sampler2D uShore;
uniform vec2 uShoreMin;
uniform vec2 uShoreSize;
uniform vec3 uFoamColor;
uniform float uGlint;
uniform vec3 uSunColor;
float seaHash( vec2 p ) { return fract( sin( dot( p, vec2( 41.3, 289.1 ) ) ) * 45758.5453 ); }
float seaNoise( vec2 p ) {
  vec2 i = floor( p ), u = fract( p );
  u = u * u * ( 3.0 - 2.0 * u );
  return mix( mix( seaHash( i ), seaHash( i + vec2( 1, 0 ) ), u.x ), mix( seaHash( i + vec2( 0, 1 ) ), seaHash( i + vec2( 1, 1 ) ), u.x ), u.y );
}
` +
      shader.fragmentShader
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
  // Ripples: two wave trains crossing; their slope tilts the normal (world space, then into view space).
  vec2 seaP = vSeaWorld.xz;
  vec2 seaSlope = vec2( 0.8, 0.6 ) * cos( dot( seaP, vec2( 0.8, 0.6 ) ) * 2.1 + uSeaTime * 1.3 )
    + vec2( -0.5, 0.86 ) * 0.7 * cos( dot( seaP, vec2( -0.5, 0.86 ) ) * 3.3 - uSeaTime * 1.7 )
    + ( vec2( seaNoise( seaP * 1.7 + uSeaTime * 0.3 ), seaNoise( seaP * 1.7 - uSeaTime * 0.25 + 7.0 ) ) - 0.5 ) * 1.2;
  vec3 seaNormalWorld = normalize( vec3( -seaSlope.x * ${f(RIPPLE)}, 1.0, -seaSlope.y * ${f(RIPPLE)} ) );
  normal = normalize( mat3( viewMatrix ) * seaNormalWorld );`,
        )
        .replace(
          '#include <opaque_fragment>',
          `// Foam by the shore, from the distance map: a solid edge, then wave lines rolling in, broken up by noise.
  vec2 seaUV = ( vSeaWorld.xz - uShoreMin ) / uShoreSize;
  float seaDist = texture2D( uShore, seaUV ).r * ${f(REACH)};
  float seaBreak = seaNoise( seaP * 2.3 + uSeaTime * 0.2 );
  float seaEdge = 1.0 - smoothstep( ${f(FOAM_EDGE * 0.5)}, ${f(FOAM_EDGE)} + 0.15 * seaBreak, seaDist );
  float seaLine = smoothstep( 0.82, 0.97, sin( ( seaDist / ${f(WAVE_SPACING)} + uSeaTime * ${f(WAVE_SPEED / WAVE_SPACING)} ) * 6.2832 ) );
  float seaWaves = seaLine * ( 1.0 - smoothstep( ${f(FOAM_EDGE)}, ${f(WAVES)}, seaDist ) ) * smoothstep( 0.25, 0.6, seaBreak );
  float seaFoam = clamp( max( seaEdge, seaWaves * 0.8 ), 0.0, 1.0 );
  // Glints: the light off the ripples, tight and sparkly.
  #if NUM_DIR_LIGHTS > 0
    vec3 seaL = directionalLights[ 0 ].direction;
    float seaSpec = pow( max( dot( reflect( - seaL, normal ), normalize( vViewPosition ) ), 0.0 ), ${f(GLINT_TIGHT)} );
    float seaSparkle = smoothstep( 0.6, 0.85, seaNoise( seaP * 5.0 + uSeaTime * 0.9 ) ); // glitter, not one big highlight
    outgoingLight += uSunColor * smoothstep( 0.25, 0.9, seaSpec ) * seaSparkle * uGlint * ( 1.0 - seaFoam );
  #endif
  // Foam is lit like a white surface: the light that reached here, divided back out of the water's colour.
  vec3 seaLit = ( reflectedLight.directDiffuse + reflectedLight.indirectDiffuse ) / max( diffuseColor.rgb, vec3( 0.02 ) );
  outgoingLight = mix( outgoingLight, uFoamColor * seaLit, seaFoam * 0.9 );
  #include <opaque_fragment>`,
        )
  }
  m.customProgramCacheKey = () => 'sea'
  return { material: m, uniforms }
}

/** The sea round the islands. `color` is the shared water colour (waterMaterial.color in Island.tsx). */
export function Sea({ color }: { color: Color }) {
  const { material, uniforms } = useMemo(() => seaMaterial(color), [color])

  useSceneFrame('world', (_, delta) => {
    if (!reducedMotion()) uniforms.uSeaTime.value += Math.min(delta, 0.1)
    uniforms.uFoamColor.value.copy(sky.foam)
    uniforms.uSunColor.value.copy(sky.sun).multiplyScalar(sky.sunIntensity)
    uniforms.uGlint.value = GLINT.day + (GLINT.night - GLINT.day) * sky.weather.night
  })

  return (
    // Receives the cliffs' and trees' shadows, never casts (noShadow keeps the sweep off it).
    <mesh rotation-x={-Math.PI / 2} position-y={WATER_Y} material={material} receiveShadow userData={{ noShadow: true }}>
      <planeGeometry args={[SIZE, SIZE, SEGMENTS, SEGMENTS]} />
    </mesh>
  )
}
