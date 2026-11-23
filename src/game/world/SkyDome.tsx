import { useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, Color, ShaderMaterial, SphereGeometry, type Mesh } from 'three'
import { useSceneFrame } from '../core/sceneFrame'
import { reducedMotion } from '../core/settings'
import { sky } from './sky'

// The sky outdoors: a dome round the camera, from the fog colour at the horizon (so the far island
// fades into it with no seam) up to a deeper zenith, with soft clouds drifting across. The camera
// looks down, so it shows as the strip above the curved horizon. Rain brings more, greyer cloud;
// at night the clouds are faint. Its own shader: no curve, no fog, never in the shadow pass.

const RADIUS = 150
const ZENITH = new Color('#7fb2e0') // the zenith leans this way from the slot's background
const ZENITH_MIX = 0.35
const DRIFT = 0.006 // cloud drift, sky units per second
const COVER = { clear: 0.55, rain: 0.25 } // noise level above which there's cloud: lower = more cloud
const CLOUD = new Color('#ffffff')
const RAIN_CLOUD = new Color('#c9d0d6')

const geometry = new SphereGeometry(RADIUS, 32, 16)

export function SkyDome() {
  const camera = useThree((s) => s.camera)
  const dome = useRef<Mesh>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: new Color() },
          uZenith: { value: new Color() },
          uCloud: { value: new Color() },
          uCover: { value: COVER.clear },
          uCloudAmount: { value: 1 },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize( position );
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uHorizon;
          uniform vec3 uZenith;
          uniform vec3 uCloud;
          uniform float uCover;
          uniform float uCloudAmount;
          uniform float uTime;
          varying vec3 vDir;
          float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
          float noise( vec2 p ) {
            vec2 i = floor( p ), f = fract( p );
            vec2 u = f * f * ( 3.0 - 2.0 * f );
            return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), u.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), u.x ), u.y );
          }
          float fbm( vec2 p ) {
            float v = 0.0, a = 0.5;
            for ( int k = 0; k < 4; k++ ) { v += a * noise( p ); p *= 2.03; a *= 0.5; }
            return v;
          }
          void main() {
            vec3 d = normalize( vDir );
            vec3 col = mix( uHorizon, uZenith, smoothstep( 0.0, 0.55, d.y ) );
            if ( d.y > 0.0 ) {
              vec2 uv = d.xz / ( d.y + 0.12 ) * 1.6 + vec2( uTime, uTime * 0.4 );
              float c = smoothstep( uCover, uCover + 0.22, fbm( uv ) ) * smoothstep( 0.0, 0.18, d.y );
              col = mix( col, uCloud, c * uCloudAmount );
            }
            gl_FragColor = vec4( col, 1.0 );
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )

  useSceneFrame('world', (_, delta) => {
    dome.current?.position.copy(camera.position) // centred on the camera, so it never gets nearer
    const u = material.uniforms
    const rain = sky.weather.rain
    const night = sky.weather.night
    ;(u.uHorizon.value as Color).copy(sky.fog)
    ;(u.uZenith.value as Color).copy(sky.background).lerp(ZENITH, ZENITH_MIX * (1 - night)).multiplyScalar(0.94)
    ;(u.uCloud.value as Color).copy(CLOUD).lerp(RAIN_CLOUD, rain).lerp(sky.fog, 0.25)
    u.uCover.value = COVER.clear + (COVER.rain - COVER.clear) * rain
    u.uCloudAmount.value = 0.85 * (1 - 0.75 * night)
    if (!reducedMotion()) u.uTime.value += delta * DRIFT
  })

  return <mesh ref={dome} geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} userData={{ noShadow: true }} />
}
