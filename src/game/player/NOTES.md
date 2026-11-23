# Player notes

The player: movement, the pill and the 3D model, the shadow, dust and light around them, the hat and the sword. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Player movement: [Player.tsx](./Player.tsx)

```ts
const SPEED = 2.5 // walking speed, units/s (a full joystick push or any WASD key)
const SPRINT = 2.5 // holding Shift (or the B button on touch) multiplies top speed by this (2.5 → 6.25 units/s); also caps the animation's speed value
const ACCEL = 12 // damp rate toward the input velocity while a direction is held; lower = slidier, heavier starts
const DECEL = 16 // damp rate back to a stop after letting go; higher than ACCEL so stops feel crisp
const SHORE = 0.15 // the pill stops this far short of the cliff edge, so its feet stay on the rim
const EDGE = PILL_RADIUS + SHORE // derived, don't edit: how close the pill's centre gets to a water tile; must stay at most half a tile
```

### Roll

```ts
const ROLL_TIME = 0.45 // seconds one tumble lasts; movement input is ignored for this long
const ROLL_SPEED = 9 // burst speed at the start of the roll, units/s
const ROLL_COOLDOWN = 0.2 // seconds after a roll ends before another can start
const STEP_LEN = [0.45, 0.7] // units travelled per footstep sound, walking and at full sprint
```

Inside the roll, speed eases from `ROLL_SPEED` down to `ROLL_SPEED × 0.4` (the `0.6` in `1 - 0.6 * roll.p`). At 9 that ends at 3.6, just under `SPEED`, so the roll blends straight into walking. If you change `ROLL_SPEED` a lot, adjust that `0.6` too so the end speed stays close to `SPEED`.

Distance covered by one roll ≈ `ROLL_SPEED × 0.7 × ROLL_TIME`, about 2.8 units with the defaults.

---

## Character model: [models.ts](./models.ts), [ModelCharacter.tsx](./ModelCharacter.tsx)

**Looking:** the model's head (and a little of the neck: `LOOK_NECK = 0.4`) turns toward whatever has focus, up to `LOOK_MAX = 0.75` radians either way, easing at `LOOK_EASE = 6`. It's added on top of the clips after the mixer runs, never while rolling, and only for something within `LOOK_FRONT = 1.6` radians of straight ahead: no glancing over a shoulder. The bones are found by name (`…Head`, `…Neck`, Mixamo's rig); a model without them just doesn't look.

```ts
export const PLAYER_MODEL: string | null = null // models.ts: path of the optimized model under public/, or null for the pill
export const PLAYER_HEIGHT = 1.2 // models.ts: the model is scaled to this height (about the pill's)
export const PLAYER_WIDTH = 1.2 // models.ts: widens the model side to side and front to back at the same height (1 = as modelled)
export const CLIPS = { idle: 'Idle', walk: 'Walk', run: 'Run' } // models.ts: clip names in the file; a missing one is skipped
const BLEND = 10 // ModelCharacter.tsx: how quickly idle, walk and run blend as speed changes (damp rate)
const WALK_RATE = [0.6, 1.25] // ModelCharacter.tsx: walk clip playback speed at a slow amble and at full walk, for a clip with no recorded pace
const MIN_RATE = 0.3 // ModelCharacter.tsx: slowest playback when matching a clip's pace to the ground speed
const MAX_RATE = 3 // ModelCharacter.tsx: fastest walk playback; past it the feet slide rather than step comically fast
const RUN_MAX_RATE = 2.75 // ModelCharacter.tsx: the same for the run (2.75× keeps pace up to a full sprint, 5 units/s)
const IDLE_PAUSE = 5 // ModelCharacter.tsx: seconds the model stands still after stopping, and between plays of its idle clip
const BREATHE = 0.012 // ModelCharacter.tsx: height swell while standing still (two slow breaths per pause)
const MODEL_LEAN = 0.12 // PillCharacter.tsx: the model's forward lean at full speed, radians (about 7°, 11° sprinting)
```

Walk and run play at the speed where their feet keep pace with the ground: `npm run models` records each clip's pace (body heights per second) when it strips the root motion, and the game divides the player's speed by it, within `MIN_RATE` and `MAX_RATE` (`RUN_MAX_RATE` for the run).

With a model set, the rig below still turns it and tumbles it through rolls (`TURN`, `ROLL_DROP`), and leans it into its movement (`MODEL_LEAN`, scaled up by `SPRINT_LEAN`), but the pill's body shape, walk cycle and feet no longer apply: the model's own clips do the walking. Making a model, the pipeline and the size budget are in [CHARACTER.md](../../../docs/CHARACTER.md).

---

## Footprints: [Footprints.tsx](./Footprints.tsx)

```ts
const POOL = 48                     // prints at most, reused oldest first
const LIFE = { road: 6, snow: 14 }  // seconds a print lasts on a dirt path, and in snow
const SPREAD = 0.09                 // how far left or right of the path each foot falls
const OPACITY = 0.6
const TINT = { road: '#5c4529', snow: '#7387a6' } // packed earth; the blue of a dent in snow
```

Each footstep on a path or in snow outdoors (Player.tsx, by distance, like the step sounds) leaves a small oval, turned with the player, alternating feet. Prints hold, then fade quickly. They sit at y = 0.03 with a polygon offset, above the roads (0.01). None on grass, wood or indoors.

---

## Around the player: [PlayerGround.tsx](./PlayerGround.tsx), [Dust.tsx](./Dust.tsx)

```ts
const SHADOW_SIZE = 0.85 // PlayerGround.tsx: blob shadow diameter, world units (the scene casts no real shadows)
const SHADOW_OPACITY = 0.2 // PlayerGround.tsx: how dark it is (faint: the sun's real shadow does the rest, this is contact shade); it tightens and lightens a little mid-roll
const NIGHT_GLOW = 2.5 // PlayerGround.tsx: the warm light on the player at full night outdoors (0 by day)
const INDOOR_GLOW = 0.4 // PlayerGround.tsx: share of NIGHT_GLOW indoors, where the room is lamp-lit
const COUNT = 16 // Dust.tsx: puffs in the pool
const LIFE = 0.45 // Dust.tsx: seconds a puff lasts
const SIZE = 0.09 // Dust.tsx: a puff's radius at its biggest
const BURST = 6 // Dust.tsx: puffs when a roll starts
const TRAIL = 0.12 // Dust.tsx: seconds between puffs while sprinting
```

```ts
const SIZE = 0.075 // Sparkle.tsx: the gold glints circling whatever the player can use; also COUNT = 5, HEIGHT = 1.55, RADIUS = 0.32, SPIN = 1.4
const SPLASH_CHANCE = 0.2 // Rain.tsx: share of raindrops landing near the player that splash; SPLASH_LIFE = 0.28, SPLASH_SIZE = 0.16
```

Dust only shows outdoors and not in the rain. The light is always there, at 0 by day: adding or removing a light would recompile every material.

---

## Character animation: [PillCharacter.tsx](./PillCharacter.tsx)

**Landing:** as a roll ends, the whole character (pill or model) squashes from the feet by `LAND_SQUASH = 0.14` and springs back over `LAND_TIME = 0.3` s, keeping its volume. Not with reduced motion.

### Body shape

```ts
export const PILL_RADIUS = 0.35 // body thickness (radius of the capsule); also sets how close it can get to the floor edge
const PILL_LENGTH = 0.4 // height of the straight middle section between the two rounded ends
const PILL_HALF = PILL_RADIUS + PILL_LENGTH / 2 // derived, don't edit: half the body's total height
const BODY_BASE = 0.12 // how high the body's bottom sits off the floor, leaving room for the feet underneath
const CENTER = BODY_BASE + PILL_HALF // derived, don't edit: the tumble spins around this point
```

If you change the body size, also check the eye positions (`[±0.12, 0.72, 0.32]` in the JSX), so they stay on the front surface.

### Walk cycle

```ts
const STEP_RATE = 5 * Math.PI // how fast the walk cycle runs at full speed; 2π = one stride (two steps), so 5π = 2.5 strides/s
const BOB = 0.08 // how high the body hops on each step, units
const SQUASH = 0.06 // squash-and-stretch amount: stretches tall mid-step, squashes at each footfall (0.06 = ±6%)
const LEAN = 0.18 // forward tilt at full speed, radians (0.18 ≈ 10°)
const TURN = 14 // how quickly it turns to face the direction of travel (a damp-style rate; higher = snappier)
const STRIDE = 0.14 // how far each foot swings forward and back from its rest spot, units
const LIFT = 0.12 // how high a foot lifts at the middle of its swing, units
const BREATHE = 0.015 // idle breathing: gentle ±1.5% scale pulse while standing still
const SPRINT_LEAN = 0.6 // extra forward lean at full sprint (+60%, about 16° in total)
const SPRINT_STRIDE = 0.3 // longer foot swing at full sprint (+30%)
```

Sprinting also speeds up the steps, because the walk cycle advances in proportion to speed (2.5× faster at full sprint). `SPRINT_LEAN` and `SPRINT_STRIDE` fade in between walking and full sprint, and they're switched off during a roll.

**Foot sliding:** a foot stays still on the floor only when its backward slide matches walking speed. That's roughly `SPEED ÷ (STEP_RATE / π) ≈ 2 × STRIDE`. With the defaults the feet slide (cartoony, intentional). To reduce it, raise `STRIDE` or `STEP_RATE`. Raising `STEP_RATE` too high makes the walk look frantic.

The walk-weight fade (`MathUtils.damp(s.w, v.speed, 8, dt)`) uses a hard-coded rate of `8`. Lower it to make the walk ease in and out more gradually.

### Roll visuals

```ts
const TUCK = 0.22 // how much the body squashes into a ball mid-roll (0.22 = 22% shorter, wider to keep its volume)
const ROLL_DROP = 0.28 // how far the body's centre drops mid-roll so it tumbles along the floor instead of above it
```

The flip is one full turn (`flip * Math.PI * 2`). Change the `2` to `4` for a double flip.

### Feet

```ts
const FOOT_X = 0.18 // sideways distance of each foot from the centre line
const FOOT_Y = 0.07 // resting height of the feet's centre (about half their flattened height, so they sit on the floor)
const FOOT_Z = 0.06 // feet rest slightly forward of centre, so they poke out the front of the body
```

The feet's shape comes from `new SphereGeometry(0.14, …)` (size) and `scale={[1, 0.55, 1.35]}` (flattened and lengthened). The scale is also set every frame, so a shape change has to be made in both the JSX and the `footL/footR.current.scale.set(…)` lines.

### Accessibility

```ts
const MOTION = reduced ? 0.3 : 1 // with "reduce motion" turned on, bob, squash and lean play at 30% strength
```

### Colours

```ts
const eyeMat = new MeshLambertMaterial({ color: '#2b2b2b' }) // eyes
const footMat = new MeshLambertMaterial({ color: '#d9a536' }) // feet (a darker yellow than the body)
// body colour: <meshLambertMaterial color="#f2c14e" /> in the JSX
```
