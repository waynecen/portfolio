# Ui notes

What sits over the game: dialogue, panels, touch controls, photo mode and the welcome back. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Touch controls: [Joystick.tsx](./Joystick.tsx)

On touch screens the **Start button** (`StartButton` in [MenuPanel.tsx](./MenuPanel.tsx), `.start-button` in [touch.css](./touch.css)) sits at the bottom, 12px right of the joystick and low enough to clear the B button. It opens the **menu**: Bag, Log, Photo, Settings, Edit room (indoors) and Put away rod (with a rod in hand). While any panel is open it shows × and closes it. The chips that do these things on a computer (the Bag button at the bottom centre, the settings gear, Edit room, Put away rod) are hidden on touch screens, so a phone's top edge only has the hearts and the now-playing label. Messages written for touch point to the menu.

```ts
const TRAVEL = 40 // pixels the knob can move from centre; dragging this far = full speed
const DEAD_ZONE = 0.15 // the first 15% of travel does nothing, so a resting thumb doesn't creep
```

Joystick and A/B button sizes and positions are in [touch.css](./touch.css) (`.joystick`, `.joystick-knob`, `.action-button` for A, `.action-button-b` for B). B sits 72px left of A (button width 64 + an 8px gap) and 24px lower. If you resize the buttons, update that `72px` too. If you resize the joystick, also update the `.action-button` `bottom` offset (it's set to line up with the joystick's middle) and the touch-device `.project-card-region` `bottom` offset (it keeps the card above the controls).

---

## Photo mode: [photo.ts](./photo.ts), [PhotoHud.tsx](./PhotoHud.tsx)

**Tilt-shift:** while in photo mode the finishing pass (world/PostFX.tsx) adds a tilt-shift blur: a band in focus across the middle, where the player stands, and blur above and below, so the island reads as a miniature (`TILT = { focusArea: 0.32, feather: 0.22, offset: 0.04 }`). It's a pass of its own, off the rest of the time.

```ts
const PAN_SPEED = 6          // units/s the camera slides with the walk keys or a stick
const PAN_MAX = 9            // how far from the player it can slide
export const ZOOM_MIN = 0.45 // nearest, as a share of the usual distance; ZOOM_MAX = 1.5 farthest
const ZOOM_STEP = 0.1        // one press of Q or E (or - and =), or one notch of the wheel; the Distance slider sets it directly
export const POSES = [...]   // Say cheese, Turn left, Turn right, Look out to sea, Jump! (a heading and a lift off the ground)
```

P (or Photo in the touch menu) hides the HUD but the stick and photo mode's buttons (`body[data-photo]` in [photo.css](./photo.css)) and holds the player still. The camera keeps its angle, as the curved world needs it facing north. 1 to 5 pick a pose. Space, Enter or Take photo renders a fresh frame and saves it as `island-YYYY-MM-DD-HHMM.png` (the black-and-white secret applies to the picture too), with a click and a white flash (not with reduced motion).

---

## The way to the page: [src/main.tsx](../../main.tsx), [SettingsPanel.tsx](./SettingsPanel.tsx)

While playing, **View as page** is a row in the settings, which sends a `requestview` event that main.tsx answers. The button at the top of the screen stays first in the tab order but is hidden until it has keyboard focus (`body.playing .view-toggle:not(:focus-visible)` in style.css), because the page is the accessible version. On the page, Play the game shows as before.

The welcome note on the table (Furniture.tsx) covers only walking and using things; the rest is met in the world. The sword is taught the first time a slime bumps the player (`sayFirst('bumped')` in combat/health.ts). There is no "point me somewhere": signposts, the glow on unseen stations and Bramble's tour are the cues.

---

## Panels and chips: [Panel.tsx](./Panel.tsx), [Chip.tsx](./Chip.tsx)

Every panel (the bag, the log, the settings, the shop, the touch menu) is a `<Panel title count toggle onKey>`: the heading row with its count and ×, Escape or the panel's own key (`toggle`, from keymap.ts) to close, and focus on its first control (not the ×) unless the panel has focused something itself. `onKey` handles the panel's own keys first. The chips are `<Chip action className>`, with the key in front on a keyboard; `.hud-chip` in hud.css is their look, and each `className` only places one. The **Bag** sits at the bottom centre with its bag icon (`LineIcon` in [LineIcon.tsx](./LineIcon.tsx), the touch menu's line drawings). The prompt and the project card sit 44px above it on a computer; the dialogue, the reel and the golf's putting panel keep the bottom, since the button hides while they're up. **Edit room** (indoors) and **Put away rod** are at the top right, the rod under Edit room indoors.

The hearts and the settings gear share a row at the top left (`.hud-top-left` in Game.tsx and hud.css), so the gear always comes after the last heart, however many there are.

**Escape** closes whatever has the player's attention (dialogue, a panel, the line, the golf putt). With nothing open (`busy()` is false) it opens the settings, as O does (input.ts). A panel that closes on Escape itself stops the key there (Panel.tsx, and the record player's panel in MusicPanel.tsx). Otherwise input.ts would find nothing open and open the settings straight after.

CSS for everything over the game is in this folder (hud.css, touch.css, panels.css, photo.css), with house.css and life.css in their folders. Game.tsx imports them in that order: hud, touch, house, panels, life, photo; a later file overrides an earlier one, so keep an override after what it overrides.
