# Ui notes

What sits over the game: dialogue, panels, touch controls, photo mode and the welcome back. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Touch controls: [Joystick.tsx](./Joystick.tsx)

On touch screens the **Start button** (`StartButton` in [MenuPanel.tsx](./MenuPanel.tsx), `.start-button` in style.css) sits at the bottom, 12px right of the joystick and low enough to clear the B button. It opens the **menu**: Bag, Log, Photo, Settings, Edit room (indoors) and Put away rod (with a rod in hand). While any panel is open it shows × and closes it. The top chips that do these things on a computer (Bag, the settings gear, Edit room, Put away rod) are hidden on touch screens, so a phone's top edge only has the hearts, and the now-playing label. Messages written for touch point to the menu.

```ts
const TRAVEL = 40 // pixels the knob can move from centre; dragging this far = full speed
const DEAD_ZONE = 0.15 // the first 15% of travel does nothing, so a resting thumb doesn't creep
```

Joystick and A/B button sizes and positions are in [style.css](../../style.css) (`.joystick`, `.joystick-knob`, `.action-button` for A, `.action-button-b` for B). B sits 72px left of A (button width 64 + an 8px gap) and 24px lower. If you resize the buttons, update that `72px` too. If you resize the joystick, also update the `.action-button` `bottom` offset (it's set to line up with the joystick's middle) and the touch-device `.project-card-region` `bottom` offset (it keeps the card above the controls).

---

## Photo mode: [photo.ts](./photo.ts), [PhotoHud.tsx](./PhotoHud.tsx)

```ts
const PAN_SPEED = 6          // units/s the camera slides with the walk keys or a stick
const PAN_MAX = 9            // how far from the player it can slide
export const ZOOM_MIN = 0.45 // nearest, as a share of the usual distance; ZOOM_MAX = 1.5 farthest
const ZOOM_STEP = 0.1        // one press of Q or E (or - and =), or one notch of the wheel; the Distance slider sets it directly
export const POSES = [...]   // Say cheese, Turn left, Turn right, Look out to sea, Jump! (a heading and a lift off the ground)
```

P (or Photo in the touch menu) hides the HUD but the stick and photo mode's buttons (`body[data-photo]` in style.css) and holds the player still. The camera keeps its angle, as the curved world needs it facing north. 1 to 5 pick a pose. Space, Enter or Take photo renders a fresh frame and saves it as `island-YYYY-MM-DD-HHMM.png` (the black-and-white secret applies to the picture too), with a click and a white flash (not with reduced motion).

---

## The way to the page: [src/main.tsx](../../main.tsx), [SettingsPanel.tsx](./SettingsPanel.tsx)

While playing, **View as page** is a row in the settings, which sends a `requestview` event that main.tsx answers. The button at the top of the screen stays first in the tab order but is hidden until it has keyboard focus (`body.playing .view-toggle:not(:focus-visible)` in style.css), because the page is the accessible version. On the page, Play the game shows as before.

The welcome note on the table (Furniture.tsx) covers only walking and using things; the rest is met in the world. The sword is taught the first time a slime bumps the player (`sayFirst('bumped')` in combat/health.ts). There is no "point me somewhere": signposts, the glow on unseen stations and Bramble's tour are the cues.
