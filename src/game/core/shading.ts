import { ShaderChunk } from 'three'

// The game's soft, stylised shading, for every Lambert material (nearly everything): a patch to
// three's shared shader chunks, like the curve (curve.ts), so no material needs its own work. This
// module must load before anything is drawn.
//
// - Wrapped diffuse: light wraps a little past the side facing away from it, so forms turn softly
//   instead of dropping to dark at the edge.
// - Cool shade: where the sun doesn't reach (turned away, or in shadow), a little cool light is added
//   in proportion to the sun's strength, so shadows read blue-violet rather than grey, the painterly
//   way. Only the sun does this; lanterns and the player's glow just wrap.
// - Warm rim: silhouette edges catch a little of the sun, a soft back-light that lifts shapes off the ground.
//
// To read the sun's shadow on its own, the directional light loop (lights_fragment_begin, shared
// with other material types) keeps the sun's colour and shadow in two globals, behind SOFT_SHADING,
// which only the Lambert material defines.

const WRAP = 0.35 // how far light wraps round; 0 = plain Lambert
const SHADE = [0.62, 0.7, 1] // the colour shadows lean toward
const SHADE_AMOUNT = 0.2 // how much of the sun's strength comes back into shade, in that colour
const RIM = [1, 0.86, 0.66] // the rim light's colour (warm)
const RIM_AMOUNT = 0.3 // its strength, as a share of the sun
const RIM_POWER = 3 // how tight to the edge it stays

const v3 = (c: number[]) => `vec3( ${c.map((x) => x.toFixed(3)).join(', ')} )`

ShaderChunk.lights_lambert_pars_fragment = /* glsl */ `
varying vec3 vViewPosition;

#define SOFT_SHADING
vec3 sunLight; // the sun's colour before its shadow (zero for every other light)
float sunShadow; // its shadow here: 1 = lit, 0 = fully shaded

struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};

void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float wrapped = saturate( ( dot( geometryNormal, directLight.direction ) + ${WRAP.toFixed(3)} ) / ${(1 + WRAP).toFixed(3)} );
	vec3 albedo = BRDF_Lambert( material.diffuseColor );
	reflectedLight.directDiffuse += wrapped * directLight.color * albedo;

	// Cool shade and warm rim: the sun only (sunLight is zero for other lights).
	float lit = wrapped * sunShadow;
	reflectedLight.indirectDiffuse += ( 1.0 - lit ) * ${SHADE_AMOUNT.toFixed(3)} * ${v3(SHADE)} * sunLight * albedo;
	float rim = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), ${RIM_POWER.toFixed(1)} );
	reflectedLight.directDiffuse += rim * ${RIM_AMOUNT.toFixed(3)} * ${v3(RIM)} * sunLight * sunShadow * albedo;
}

void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}

#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert
`

// The directional loop: note the sun's colour before its shadow, and the shadow itself.
const begin = ShaderChunk.lights_fragment_begin
const info = 'getDirectionalLightInfo( directionalLight, directLight );'
const shadow = /directLight\.color \*= (\( directLight\.visible && receiveShadow \) \? getShadow\( directionalShadowMap[^;]*;)/
if (!begin.includes(info) || !shadow.test(begin)) throw new Error('shading.ts: three changed lights_fragment_begin; update the patch')
ShaderChunk.lights_fragment_begin =
  `#ifdef SOFT_SHADING\nsunLight = vec3( 0.0 );\nsunShadow = 1.0;\n#endif\n` +
  begin
    .replace(info, `${info}\n\t\t#ifdef SOFT_SHADING\n\t\tsunLight = directLight.color;\n\t\tsunShadow = 1.0;\n\t\t#endif`)
    .replace(shadow, `{\n\t\tfloat s = $1\n\t\t#ifdef SOFT_SHADING\n\t\tsunShadow = s;\n\t\t#endif\n\t\tdirectLight.color *= s;\n\t\t}`)
