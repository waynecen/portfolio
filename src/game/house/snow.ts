import type { MeshLambertMaterial } from 'three'

// Snow on the house model's roof in winter. The model is one textured mesh, so the snow is found by
// shape, not by part: whatever faces up (UP) and stands above the eaves (ROOF_FROM) turns snow white, the
// same white the block roof used. The texture's shading shows through a little, so the tiles still
// read under it. Runs after any patch the material already has (glowWindows).

const ROOF_FROM = 1.25 // world height where the roof starts; the doorstep and sills below it stay bare
const UP = [0.3, 0.55] as const // a surface this far facing up starts to hold snow, and is fully white by the second
const SNOW = [0.95, 0.96, 0.98] as const // linear; '#f2f5f9', as the block roof
const FILL = 0.2 // how bright the snow's own fill is (PropModel's FILL lights the texture, which is orange there)

/** Lays snow on whatever faces up above the eaves. For PropModel's `patch`, in winter only. */
export function snowRoof(material: MeshLambertMaterial) {
  const before = material.onBeforeCompile.bind(material)
  const key = material.customProgramCacheKey.bind(material)
  const f = (x: number) => x.toFixed(3)
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer)
    shader.vertexShader =
      'varying float vSnow;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  {
    float up = normalize( mat3( modelMatrix ) * objectNormal ).y;
    float y = ( modelMatrix * vec4( transformed, 1.0 ) ).y;
    vSnow = smoothstep( ${f(UP[0])}, ${f(UP[1])}, up ) * smoothstep( ${f(ROOF_FROM)}, ${f(ROOF_FROM + 0.1)}, y );
  }`,
      )
    const snow = `vec3( ${f(SNOW[0])}, ${f(SNOW[1])}, ${f(SNOW[2])} )`
    shader.fragmentShader =
      'varying float vSnow;\n' +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
  {
    float shade = dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) );
    diffuseColor.rgb = mix( diffuseColor.rgb, ${snow} * ( 0.8 + 0.4 * shade ), vSnow );
  }`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
  totalEmissiveRadiance = mix( totalEmissiveRadiance, ${snow} * ${f(FILL)}, vSnow );`,
        )
  }
  material.customProgramCacheKey = () => key() + '-snow'
}
