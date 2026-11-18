// The player character's 3D model. While PLAYER_MODEL is null (or while the model is still
// downloading) the player is the pill. See docs/CHARACTER.md for making and adding a model.

/** Path under public/ of the optimized model (from `npm run models`), or null for the pill. */
export const PLAYER_MODEL: string | null = null

/** The model is scaled to this height in world units: about the pill's, so the camera and collision still fit. */
export const PLAYER_HEIGHT = 1.2

/** Animation clip names in the model's file. A missing clip is skipped (no run clip: the walk plays faster). */
export const CLIPS = { idle: 'Idle', walk: 'Walk', run: 'Run' }
