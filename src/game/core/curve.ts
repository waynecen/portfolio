import { ShaderChunk } from 'three'
import { DISTANCE } from './CameraRig'

// The curved world: everything further from the camera than the player bends down out of sight,
// so the horizon rolls away like the top of a small planet (Animal Crossing's look). It's done in
// three's shared vertex step (the project_vertex chunk) that every built-in material uses, so all
// of them bend alike with no per-material work. This module must load before anything is drawn.
//
// The shadow pass (three's depth material, which defines DEPTH_PACKING) is left unbent: there
// cameraPosition is the light's, not the camera's. Receivers look shadows up from unbent world
// positions too, so casters and receivers still agree (world/Shadows.tsx).
//
// Only the far side bends, and only past FLAT units behind the player, so the ground you walk on
// (and the whole room indoors) stays flat. The bend is a parabola: CURVE × distance².

const CURVE = 0.02 // how fast the ground falls away past FLAT; 0 turns the curve off
const FLAT = 6 // units behind the player before it starts

// Where the camera looks is a fixed offset from where it sits (see CameraRig.tsx), so the shader
// finds the player's depth from cameraPosition, which every material already has.
ShaderChunk.project_vertex = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
vec4 curvedWorld = modelMatrix * mvPosition;
#ifndef DEPTH_PACKING
float curveBehind = min( curvedWorld.z - ( cameraPosition.z - ${DISTANCE.toFixed(4)} ) + ${FLAT.toFixed(4)}, 0.0 );
curvedWorld.y -= ${CURVE.toFixed(6)} * curveBehind * curveBehind;
#endif
mvPosition = viewMatrix * curvedWorld;
gl_Position = projectionMatrix * mvPosition;
`
