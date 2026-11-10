# Tuning reference

Every constant that changes how the game looks, moves or performs, grouped by system. Each block shows the code as it appears in the source, with a comment explaining what the value does. Change the value in the linked file, not here. If you add or rename a constant, update this page too.

**Units:** distances are in world units (the floor is 16 units across, and the pill is about 1.2 tall). Times are in seconds. Angles are in radians (π ≈ 3.14 is half a turn).

**Damp rates:** several values are rates passed to `MathUtils.damp`, which eases a value toward a target. Higher is snappier. Roughly, a value covers 63% of the remaining gap in `1 / rate` seconds, so a rate of 10 gets 63% of the way in 0.1 s and is basically there by 0.3 s.

---

## Player movement: [src/game/Player.tsx](../src/game/Player.tsx)

```ts
export const FLOOR_RADIUS = 8 // radius of the round floor; the floor mesh and the walkable edge both use it
const SPEED = 4               // top walking speed, units/s (a full joystick push or any WASD key)
const ACCEL = 12              // damp rate toward the input velocity while a direction is held; lower = slidier, heavier starts
const DECEL = 16              // damp rate back to a stop after letting go; higher than ACCEL so stops feel crisp
const LIMIT = FLOOR_RADIUS - PILL_RADIUS // derived, don't edit: how far the centre can go before the body would hang off the edge
```

### Roll

```ts
const ROLL_TIME = 0.45    // seconds one tumble lasts; movement input is ignored for this long
const ROLL_SPEED = 9      // burst speed at the start of the roll, units/s
const ROLL_COOLDOWN = 0.2 // seconds after a roll ends before another can start
```

Inside the roll, speed eases from `ROLL_SPEED` down to `ROLL_SPEED × 0.4` (the `0.6` in `1 - 0.6 * roll.p`). At 9 that ends at 3.6, just under `SPEED`, so the roll blends straight into walking. If you change `ROLL_SPEED` a lot, adjust that `0.6` too so the end speed stays close to `SPEED`.

Distance covered by one roll ≈ `ROLL_SPEED × 0.7 × ROLL_TIME`, about 2.8 units with the defaults.

---

## Character animation: [src/game/PillCharacter.tsx](../src/game/PillCharacter.tsx)

### Body shape

```ts
export const PILL_RADIUS = 0.35 // body thickness (radius of the capsule); also sets how close it can get to the floor edge
const PILL_LENGTH = 0.4         // height of the straight middle section between the two rounded ends
const PILL_HALF = PILL_RADIUS + PILL_LENGTH / 2 // derived, don't edit: half the body's total height
const BODY_BASE = 0.12          // how high the body's bottom sits off the floor, leaving room for the feet underneath
const CENTER = BODY_BASE + PILL_HALF            // derived, don't edit: the tumble spins around this point
```

If you change the body size, also check the eye positions (`[±0.12, 0.72, 0.32]` in the JSX), so they stay on the front surface.

### Walk cycle

```ts
const STEP_RATE = 5 * Math.PI // how fast the walk cycle runs at full speed; 2π = one stride (two steps), so 5π = 2.5 strides/s
const BOB = 0.08              // how high the body hops on each step, units
const SQUASH = 0.06           // squash-and-stretch amount: stretches tall mid-step, squashes at each footfall (0.06 = ±6%)
const LEAN = 0.18             // forward tilt at full speed, radians (0.18 ≈ 10°)
const TURN = 14               // how quickly it turns to face the direction of travel (a damp-style rate; higher = snappier)
const STRIDE = 0.14           // how far each foot swings forward and back from its rest spot, units
const LIFT = 0.12             // how high a foot lifts at the middle of its swing, units
const BREATHE = 0.015         // idle breathing: gentle ±1.5% scale pulse while standing still
```

**Foot sliding:** a foot stays still on the floor only when its backward slide matches walking speed. That's roughly `SPEED ÷ (STEP_RATE / π) ≈ 2 × STRIDE`. With the defaults the feet slide (cartoony, intentional). To reduce it, raise `STRIDE` or `STEP_RATE`. Raising `STEP_RATE` too high makes the walk look frantic.

The walk-weight fade (`MathUtils.damp(s.w, v.speed, 8, dt)`) uses a hard-coded rate of `8`. Lower it to make the walk ease in and out more gradually.

### Roll visuals

```ts
const TUCK = 0.22      // how much the body squashes into a ball mid-roll (0.22 = 22% shorter, wider to keep its volume)
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
const eyeMat = new MeshLambertMaterial({ color: '#2b2b2b' })  // eyes
const footMat = new MeshLambertMaterial({ color: '#d9a536' }) // feet (a darker yellow than the body)
// body colour: <meshLambertMaterial color="#f2c14e" /> in the JSX
```

---

## Camera: [src/game/CameraRig.tsx](../src/game/CameraRig.tsx)

```ts
export const HEIGHT = 12   // how high the camera sits above the floor
export const DISTANCE = 12 // how far back (toward the viewer) it sits from the player; equal HEIGHT and DISTANCE = a 45° view
const LAMBDA = 4           // follow rate: higher = camera sticks closer to the player, lower = floatier lag
```

To zoom, change `HEIGHT` and `DISTANCE` together. To make the view more top-down, raise `HEIGHT` relative to `DISTANCE`.

Field of view is set in [Game.tsx](../src/game/Game.tsx): `fov: 35` (degrees). Lower is more zoomed-in and flatter, higher is wider and more distorted.

---

## Project stations: [src/game/Station.tsx](../src/game/Station.tsx), [src/game/projects.ts](../src/game/projects.ts)

```ts
const RANGE = 1.5 // Station.tsx: how close the player must be to a station for its project card to show
const RING = 5    // projects.ts: stations are spaced evenly around a circle of this radius, the first straight ahead of spawn
// Station.tsx: rotation.y += delta * 0.8 — spin speed of the marker's top, radians/s
```

The projects themselves aren't constants. They're read from the `#projects article` elements in [index.html](../index.html), so adding an `<article>` there adds a station.

---

## Touch controls: [src/game/Joystick.tsx](../src/game/Joystick.tsx)

```ts
const TRAVEL = 40      // pixels the knob can move from centre; dragging this far = full speed
const DEAD_ZONE = 0.15 // the first 15% of travel does nothing, so a resting thumb doesn't creep
```

Joystick and A-button sizes and positions are in [style.css](../src/style.css) (`.joystick`, `.joystick-knob`, `.action-button`). If you resize the joystick, also update the `.action-button` `bottom` offset (it's set to line up with the joystick's middle) and the touch-device `.project-card-region` `bottom` offset (it keeps the card above the controls).

---

## Keyboard: [src/game/input.ts](../src/game/input.ts)

```ts
const codes: Record<string, Dir> = {
  KeyW: 'forward', ArrowUp: 'forward',  // physical key positions (e.code), so it works on any keyboard layout
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
}
// Space = roll (in bindKeys); E / Enter = open the nearby project (in bindInteract)
```

---

## HUD hearts: [src/game/store.ts](../src/game/store.ts), [src/game/Hearts.tsx](../src/game/Hearts.tsx)

```ts
maxHearts: 3 // store.ts: number of heart containers shown
health: 6    // store.ts: starting health in HALF hearts (6 = 3 full hearts; 5 = 2½)
```

Hearts.tsx colours:

```tsx
<stop offset="0" stopColor="#ff6b5e" />    // red gradient: light top-left…
<stop offset="0.55" stopColor="#e2262b" /> // …main red…
<stop offset="1" stopColor="#a3121a" />    // …dark bottom-right
<stop offset="0" stopColor="#4a3436" />    // empty-socket gradient top
<stop offset="1" stopColor="#2b1c1e" />    // empty-socket gradient bottom
stroke="#2a1416" strokeWidth="2.2"         // outline colour and thickness
```

Heart size on screen is `.heart { width: 32px }` in [style.css](../src/style.css).

---

## World and rendering: [src/game/Game.tsx](../src/game/Game.tsx), [src/game/quality.ts](../src/game/quality.ts)

```tsx
dpr={tier === 'low' ? [1, 1.25] : [1, 1.5]}  // render resolution cap relative to the screen; the biggest performance lever on phones
gl={{ antialias: tier === 'high' }}         // smooth edges only on stronger devices
<color attach="background" args={['#cfe8d5']} />              // sky / background colour
<hemisphereLight args={['#ffffff', '#88aa77', 1.2]} />        // sky colour, ground-bounce colour, brightness
<directionalLight position={[5, 10, 4]} intensity={1.5} />    // the "sun": direction it shines from, and strength
<circleGeometry args={[FLOOR_RADIUS, 32]} />                  // floor: radius, and 32 edge segments (more = rounder)
<meshLambertMaterial color="#8cc084" />                       // floor colour
```

quality.ts decides the device tier:

```ts
return mobile || cores <= 4 || mem <= 4 ? 'low' : 'high' // touch devices, ≤4 CPU cores, or ≤4 GB RAM get the 'low' tier
```

---

## Start-up: [src/main.tsx](../src/main.tsx)

```ts
requestIdleCallback(start, { timeout: 1500 }) // start loading the game when the browser is idle, or after 1.5 s at the latest
setTimeout(start, 200)                        // fallback for browsers without requestIdleCallback (Safari): start after 0.2 s
```
