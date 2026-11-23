# Golf notes

The mini golf: Gull Rock Links, on the islet's east lobe (`LINKS` in [Island.tsx](../world/Island.tsx)), reached by rowing out with the oar from the cave. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## The ball: [golf.ts](./golf.ts)

```ts
export const BALL_R = 0.07
export const CUP_R = 0.13   // the ball drops when its centre comes this close to the cup's...
const SINK_SPEED = 1.9      // ...and it's slower than this (units/s); faster, it rolls over the lip
const LIP = 0.35            // a lip-out turns the ball by up to this much (radians) and keeps 70% of its speed
const PULL = 0.32           // within this of the cup, a slow ball is drawn toward it...
const PULL_ACCEL = 2.5      // ...this hard (units/s²)
const FRICTION = 2.2        // rolling slows the ball by this much (units/s²)...
const DRAG = 0.3            // ...plus this share of its speed every second
const STOP = 0.05           // below this speed it stops
const BOUNCE = 0.72         // share of its speed the ball keeps off a wall
export const MAX_SPEED = 7.5 // a full-power putt (units/s)
const STEP = 1 / 240        // physics step, short enough that a full-power putt can't pass through a kerb
```

The ball rolls in 2D on the green, in fixed steps, bounces off the kerb round the green and off any blocks on it, and is drawn into the cup when it's slow and close. It doesn't touch the player, and the player can walk across the green. On hole 1 a putt of about 0.8 power from the tee drops; a full one lips out and runs on.

## Putting: [golf.ts](./golf.ts), [Course.tsx](./Course.tsx), [GolfHud.tsx](./GolfHud.tsx)

```ts
const CHARGE = 0.9     // seconds from no power to full while charging; then back down, and up again
const AIM_SPEED = 1.8  // radians/s the walk keys or the stick turn the aim
const RANGE = 0.8      // how close to the ball the player has to be to step up to it
const STAND = 0.5      // how far behind the ball the player stands
const DRAG_FULL = 0.32 // a drag this long (share of the screen's shorter side) is full power
const SUNK_FOR = 1.2   // seconds the ball sits in the cup before it's back on the tee
const NEAR = 2.5       // the scorecard shows within this of the green
const PICK_UP = 2      // after this many times par, "Pick it up" moves on, scored as par + 2
const GENTLE_NEAR = 0.7 // gentle greens (settings.ts: golfAssist): within this of the cup...
const GENTLE_FRICTION = 1.6 // ...the ball slows by this much more (units/s²); the aim line is also 1.5× longer (Course.tsx: AIM_GENTLE)
```

Use the resting ball (**Putt**) to step up to it: the player holds still behind it (store.ts: `putting`, so `held()` is true) and an aim line of dots shows the way, bouncing once off the kerb and growing with the power.

- **Keyboard and controller:** the walk keys or the stick turn the aim; hold the sword's key or button (X on a pad) to charge, and let go to putt. The power rises and falls while it's held.
- **Mouse and touch:** drag back from anywhere on the screen and let go, like a slingshot; the putt goes the opposite way to the pull.
- **Stepping away:** the use key, Escape, A or B on a pad, or the Step away button.

Core input reaches the golf through `putter` in [core/putt.ts](../core/putt.ts), since this folder loads later (Game.tsx). While putting, the joystick, the A and B buttons and the prompt step aside (`body[data-putting]` in [golf.css](./golf.css)), and the reel-style panel at the bottom shows the meter and how to putt. The scorecard at the top shows the hole, its par, the stroke and the best so far.

Sinking the ball rattles in the cup, says the score (and "your best yet" when it is), plays the fanfare for a hole in one or chimes at par or better, gives a shell at par or better, keeps the best for each hole and moves on to the next hole. After the last, the round's card opens in a `<Panel>` ([RoundPanel.tsx](./RoundPanel.tsx), panel `'golf'`): each hole's strokes against par (marked "picked up" or "in one!"), the total, kind words, and the best round. It keeps the best round, fires the `Golf finished` analytics event (strokes, par, vs) and starts again at hole 1; Play again, × or Escape closes the card. The first round under par wins the **trophy** for the house: it's saved as `trophy` in `golf-v1`, and [house/trophy.ts](../house/trophy.ts) puts it on the dresser. After twice par, **Pick it up** on the scorecard moves on, scored as par + 2. The scorecard shows the round so far against par (E for level), and "Assist on" while gentle greens is on; it only shows outdoors. Everything is in `golf-v1` (`best`, `bestRound`, `done`, `trophy`), progress, so Start over forgets it. The putt's tap is louder and duller for a harder putt (sfx.ts: `tap`).

## Holes: [holes.ts](./holes.ts)

Each hole is data: a `name`, its `par`, the `green` (a rectangle, inside the kerb), the `tee`, the `cup`, `blocks` (boxes on the green the ball bounces off) and `slopes` (boxes that push a rolling ball by `ax`, `az` units/s², drawn as lighter stripes the way they push; friction holds a ball at rest on one). Every hole uses the same 6.6 × 2.2 green on the links, and the course changes round it after each hole, so nothing new has to fit on the land. The holes: **The Straight** (par 2), **Round the Wall** (par 3, a wall hides the cup: go round or bank), **The Tilt** (par 2, a slope pushes south) and **Two Ways** (par 3, round a block either side; a slope carries the south way on). In a simulation of every power and angle from the tee, no putt leaves the green, and holes 1, 3 and 4 can be holed in one. The sign by the tee names the hole.
