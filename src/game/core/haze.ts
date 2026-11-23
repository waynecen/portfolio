import { ShaderChunk } from 'three'
import './curve'

// Height fog: mist that pools low, over the water and round the foot of the cliffs, on top of the
// ordinary fog by distance. It uses the curved height (curve.ts), so the far island, bending away
// below the horizon, sinks into haze too. Patched into three's shared fog chunks, so every material
// with fog gets it.
//
// Its strength comes from how close the slot's fog starts (sky.ts fogNear): the misty dawn (11) gets
// nearly all of it, rain (22) and night (24) a little, the clear morning (60) and evening (40) none,
// and indoors (fog pushed out of sight) none. That keeps it in step with each slot's look with no new
// uniform, which a shared chunk can't add.

const LOW = -1.3 // at and below this height the mist is full (the water is at -1.2)
const HIGH = -0.1 // above this, none: the ground you walk on (y = 0) stays clear
const CLOSE = 10 // fogNear at or under this: full strength
const OPEN = 30 // fogNear at or over this: none
const MOST = 0.85 // never quite opaque

// The curve patch marks that curvedWorld (the bent world position) exists by this point.
ShaderChunk.project_vertex += '\n#define HAS_CURVED_WORLD\n'

ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying float vFogHeight;
#endif
`

ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	#ifdef HAS_CURVED_WORLD
		vFogHeight = curvedWorld.y;
	#else
		vFogHeight = 100.0; // sprites and the like: above the mist
	#endif
#endif
`

ShaderChunk.fog_pars_fragment = ShaderChunk.fog_pars_fragment.replace(
  'varying float vFogDepth;',
  'varying float vFogDepth;\n\tvarying float vFogHeight;',
)

const f = (x: number) => x.toFixed(3)
ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
		float hazeStrength = 1.0 - smoothstep( ${f(CLOSE)}, ${f(OPEN)}, fogNear );
		float haze = ( 1.0 - smoothstep( ${f(LOW)}, ${f(HIGH)}, vFogHeight ) ) * hazeStrength * ${f(MOST)};
		fogFactor = max( fogFactor, haze );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`
