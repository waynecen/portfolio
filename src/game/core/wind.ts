import type { Material } from 'three'
import { reducedMotion } from './settings'
import { playerPos } from './state'

// Wind: trees and grass sway from one shared clock, done in the vertex shader so nothing moves on the
// CPU. Each vertex bends by the square of its height (the base stays planted, the top moves most), in
// one world direction for the whole island, with a phase from where it stands so the sway ripples
// across rather than everything moving as one. Grass also leans away from the player as they walk
// through. Rain blows harder; with reduced motion everything stands still.
//
// The shadow pass doesn't sway (three's depth material is shared), so shadows stay put; the sway is
// small enough that it doesn't show.

const SPEED = 1.3 // the sway's base rate, rad/s
const RAIN = 1.8 // how much harder it blows in the rain
const RIPPLE = [0.37, 0.23] // how the phase changes across the island, per unit: the gusts' spacing

/** Shared by every swaying material: [clock, strength], and the player's x, z. */
const uWind = { value: [0, 1] as [number, number] }
const uPlayer = { value: [0, 0] as [number, number] }

/** Moves the wind on; call once a frame (Atmosphere.tsx). `rain` is how much it's raining, 0 to 1. */
export function tickWind(delta: number, rain: number) {
  const still = reducedMotion()
  uWind.value[0] += delta
  uWind.value[1] = still ? 0 : 1 + (RAIN - 1) * rain
  uPlayer.value[0] = playerPos.x
  uPlayer.value[1] = playerPos.z
}

export type Sway = {
  /** Height (in the mesh's own units) at which the sway is full; below it the bend eases in. */
  height: number
  /** How far the top moves, world units. */
  amount: number
  /** Sway rate, as a multiple of SPEED (grass is quicker than trees). */
  rate?: number
  /** Grass: lean away from a player closer than this (world units), and by how much. */
  part?: { radius: number; amount: number }
}

/**
 * Makes `material` sway in the wind. Works with an instanced mesh (each instance sways from where it
 * stands) or a plain one. Keeps any onBeforeCompile the material already has (it runs first).
 */
export function sway<M extends Material>(material: M, s: Sway): M {
  const before = material.onBeforeCompile.bind(material)
  const key = material.customProgramCacheKey.bind(material)
  const f = (x: number) => x.toFixed(4)
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer)
    shader.uniforms.uWind = uWind
    shader.uniforms.uWindPlayer = uPlayer
    shader.vertexShader =
      'uniform vec2 uWind;\nuniform vec2 uWindPlayer;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  #ifdef USE_INSTANCING
    vec3 windBase = instanceMatrix[3].xyz;
  #else
    vec3 windBase = ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
  #endif
  float windBend = clamp( transformed.y / ${f(s.height)}, 0.0, 1.0 );
  windBend *= windBend;
  float windPhase = dot( windBase.xz, vec2( ${f(RIPPLE[0])}, ${f(RIPPLE[1])} ) );
  float windT = uWind.x * ${f(SPEED * (s.rate ?? 1))};
  // A steady lean one way, a slow gust on top, and a little flutter: never a plain back-and-forth.
  vec3 windPush = vec3(
    0.35 + sin( windT + windPhase ) + 0.3 * sin( windT * 2.3 + windPhase * 1.7 ),
    0.0,
    0.5 * sin( windT * 0.8 + windPhase * 1.3 )
  ) * ${f(s.amount)} * uWind.y * windBend;
  ${
    s.part
      ? `vec2 windAway = windBase.xz - uWindPlayer;
  float windNear = length( windAway );
  windPush.xz += windAway / max( windNear, 0.001 ) * ( 1.0 - smoothstep( 0.0, ${f(s.part.radius)}, windNear ) ) * ${f(s.part.amount)} * windBend;`
      : ''
  }
  // The push is in world units; into the mesh's own space (undoing its turn and size).
  #ifdef USE_INSTANCING
    mat3 windM = mat3( instanceMatrix );
    transformed += transpose( windM ) * windPush / dot( windM[0], windM[0] );
  #else
    mat3 windM = mat3( modelMatrix );
    transformed += transpose( windM ) * windPush / dot( windM[0], windM[0] );
  #endif`,
      )
  }
  material.customProgramCacheKey = () => `${key()}|sway:${s.height},${s.amount},${s.rate ?? 1},${s.part?.radius ?? 0},${s.part?.amount ?? 0}`
  return material
}
