# Combat notes

The light action: the sword, grass and pots, slimes, hearts and shells. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Sword, grass, pots, slimes and hearts: [combat.ts](./combat.ts), [Sword.tsx](../player/Sword.tsx), [Grass.tsx](./Grass.tsx), [Slimes.tsx](./Slimes.tsx), [health.ts](./health.ts), [drops.ts](./drops.ts)

```ts
const SWING_TIME = 0.24 // combat.ts: seconds for a swing; SPIN_TIME = 0.45 for a spin
const REACH = 0.95      // how far in front a swing reaches (to a target's edge), within 80° of facing; SPIN_REACH = 1.25 all round
const CHARGE = 0.65     // seconds of holding after a swing before a spin is ready (the blade glows)
const SWING_SPEED = 0.35 // Player.tsx: top speed while swinging, as a share
const TUFTS = 90        // Grass.tsx: tufts of tall grass, seeded (SEED = 11); REGROW = 60 s after cutting, once the player is REGROW_AWAY = 5 off
const GRASS_DROP = { heart: 0.06, shell: 0.16 } // chances a cut tuft leaves a heart or a shell; POT_DROP = { heart: 0.25, shell: 0.5 }
const COUNT = 5         // Slimes.tsx: slimes, each with a home in open meadow HOME_AWAY = 8 from the house and two tiles clear of any road
const SEE = 3.2         // how close the player must be before a slime hops their way (it never strays more than LEASH = 3 from home to chase)
const HP = 2            // sword hits to pop one (a spin does 2); RESPAWN = 40 s later, out of sight; DROP = { heart: 0.25, shell: 0.5 }
const INVULN = 1.2      // health.ts: seconds of flicker after a bump, when nothing can hurt the player; STAGGER = 0.22, KNOCK = 6
const DROP_LIFE = 20    // drops.ts: seconds a drop waits (blinking for the last 4); MAX = 16 at once; GRAB = 0.55 to pick one up
```

**Finding it:** the sword starts in the chest beside the bed ([armed.ts](./armed.ts), saved as `sword-v1`, so Start over puts it back). Until the chest is opened (**Open**, house/Furniture.tsx), the sword's keys do nothing, and the first slime bump points to the chest instead of explaining the swing.

J, X or the left mouse button swings the sword in an arc in front of the player, slowing them while it does; holding the key (or button) after the swing charges it, and letting go once the blade glows spins it all the way round, twice as strong. On touch screens a quick tap of B (under `TAP = 0.22` s, Joystick.tsx) swings; holding B still sprints. With the fishing rod in hand the sword stays put. Anything that can be struck registers with `addHittable` (the same pattern as `register` for interactables).

Tall grass and a few clay pots (beside the house and by the dock) can be cut and broken, leaving a shell or, if the player is missing some, a heart. Shells are kept in this browser (`shells-v1`), counted in the bag's header and shown at the top for a moment when picked up; they're for the shop, later (ROADMAP C14). Pots can't be picked up and thrown yet.

Five slimes hop about the outer meadows. A bump costs half a heart, knocks the player back and leaves them flickering and untouchable for a moment. Slimes never hop onto a road, near a place or under the house, so every project stays one safe walk away, and the Slimes switch in the settings takes them away entirely. At zero hearts the screen fades and the player wakes in bed with every heart back, nothing lost.

---

## HUD hearts: [store.ts](../core/store.ts), [Hearts.tsx](./Hearts.tsx)

```ts
const MAX_HEARTS = 3 // store.ts: number of heart containers shown
health: loadHealth() // store.ts: in HALF hearts (6 = 3 full hearts; 5 = 2½); full on a first visit, then whatever was left last time (hearts-v1)
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

Heart size on screen is `.heart { width: 32px }` in [ui/hud.css](../ui/hud.css).
