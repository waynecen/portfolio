import type { MeshLambertMaterial } from 'three'

// The house model's windows light up at night. Its panes are the only blue in its texture, so the
// glow is drawn where a texel is clearly bluer than it is red: no positions to keep in step
// with the model. HouseExterior sets `windowGlow.value` each frame from how much it's night.

const BRIGHT = 0.45 // the glow at full night; kept under white, so it reads as warm lamplight
export const windowGlow = { value: 0 } // 0 by day, 1 at full night

/** Lets `material` glow warm where its texture is blue, by windowGlow. For PropModel's `patch`. */
export function glowWindows(material: MeshLambertMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindowGlow = windowGlow
    shader.fragmentShader =
      'uniform float uWindowGlow;\n' +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  #ifdef USE_MAP
  {
    vec3 pane = texture2D( map, vMapUv ).rgb;
    float blue = smoothstep( 0.03, 0.1, pane.b - pane.r );
    totalEmissiveRadiance += vec3( 1.0, 0.62, 0.26 ) * ${BRIGHT.toFixed(2)} * uWindowGlow * blue;
  }
  #endif`,
      )
  }
  material.customProgramCacheKey = () => 'window-glow'
}
