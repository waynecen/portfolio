# Portfolio notes

The portfolio itself: projects and their stations, the About sign, the mailbox, the project card and places seen. The constants that tune it, and the rules it follows. Units and damp rates are explained in [docs/TUNING.md](../../../docs/TUNING.md). Change a value in its file, then here.

---

## Project stations: [Station.tsx](./Station.tsx), [projects.ts](./projects.ts)

```ts
const RANGE = 1.5 // Station.tsx: how close the player must be to a station for its project card to show
const RING = 5 // projects.ts: stations are spaced evenly around a circle of this radius, the first straight ahead of spawn
// Station.tsx: rotation.y += delta * 0.8 — spin speed of the marker's top, radians/s
const GLOW = '#ffd27a' // an unseen project's gem glows this colour, pulsing between GLOW_MIN = 0.25 and GLOW_MAX = 0.8 at PULSE = 2.2 rad/s
const SAVE_KEY = 'seen-v1' // seen.ts: localStorage key for the places seen; change it to forget them
```

The projects themselves aren't constants. They're read from the `#projects article` elements in [index.html](../../../index.html), so adding an `<article>` there adds a station. Mark one `data-game="hidden"` to keep it on the page with no station (the two placeholders are, for now).

**Places seen** ([seen.ts](./seen.ts)): every project, the About sign and the Contact mailbox is a place (`PLACES`). A place counts as seen once its card has shown (a project, the mailbox) or once it's been used (the sign, which has no card); an interactable names its place with `seen` when it registers. The list is saved in this browser and shown at the top of the bag ("2 of 3 projects seen"), and a project's gem glows until it's been seen. A project's place id is its title, so renaming one in index.html makes it unseen again.

**Welcome back** ([visits.ts](../ui/visits.ts), [WelcomeBack.tsx](../ui/WelcomeBack.tsx), [Leaves.tsx](../ui/Leaves.tsx)): the browser keeps when the first and last visits were and how many there have been (`visits-v1`; a reload within `SAME_VISIT` = 30 minutes is the same visit). A returning visitor is greeted 1.5 s (`DELAY`) after the game shows, in words that depend on the days away (one, a few, over a week, a long time). From `MIN_DAYS = 2` days away, one pile of leaves per day blows in beside the roads within `NEAR = 9` tiles of the house, at most `PILES = 6`; walking within `SWEEP = 0.55` sweeps one up with a rustle, and the last plays the find chime. A first visit gets no greeting: the note by the bed does that.

**Calendar moments** ([calendar.ts](../secrets/calendar.ts), [Festive.tsx](../secrets/Festive.tsx)): on arriving, the island says a line on its birthday (`ISLAND_BIRTHDAY`, a placeholder set to 20 November; change it to the day the site went up), New Year's Day, Valentine's Day, Halloween, Christmas Eve and Day, and New Year's Eve, and thanks visitors on their 10th, 25th, 50th and 100th visit (`MILESTONES`). Pumpkins (Halloween), presents (Christmas) or balloons (the birthday) stand by the front door on those days. Between 2 and 5am (`NIGHT`), the About sign asks if you shouldn't be asleep before its words. Add `?date=MM-DD` to the URL to try a day, with `?hour=` for the time.

**Settings** ([settings.ts](../core/settings.ts), [SettingsPanel.tsx](../ui/SettingsPanel.tsx)): O, Escape when nothing else is open, or the gear after the hearts opens them; they're kept in this browser (`settings-v1`). Music and Sound effects have separate sliders. Motion is "Match my device" (the default), "Reduce" or "Full": every effect that used to read `prefers-reduced-motion` once at load now calls `reducedMotion()`, which follows this choice live, and `body.reduce-motion` does the same for the CSS animations. Larger text scales the dialogue, prompts, cards and panels by 1.2 (`body.big-text`). The fishing assist doubles the time to reel in a bite (`ASSIST_BITE_TIME = 1.8` s in fishing.ts) and shows **Assist on** on the prompt while the line is out, so it's never hidden help. The page view's choice to start in the game still follows the device setting (main.tsx).

**Secrets** ([secrets.ts](../secrets/secrets.ts), [Trinkets.tsx](../secrets/Trinkets.tsx)): three odd trinkets (`SECRETS`), small spinning stars in quiet corners: deep in the forest, the far east tip, and behind the house where the camera can't see. Picking one up switches on its harmless effect, and the settings panel's Secrets section switches each found one on and off (`secrets-v1`). **Confetti steps** colours the dust and leaves a trail at walking pace (`CONFETTI_STEP = 0.3` in Dust.tsx), indoors too. **Tiny you** shrinks the character to `TINY = 0.55` (Player.tsx); collisions are unchanged. **Black and white** puts a greyscale filter on the game (`body.secret-mono` in style.css). Each trinket's `at` is only where it would like to be; it moves to the nearest grass tile off the roads and clear of trees.

**The notice board** ([notice.ts](../world/notice.ts), [NoticeBoard.tsx](../world/NoticeBoard.tsx)): stands on the city square's corner nearest the shop, at `NOTICE_AT` (layout.ts). Each read pins up a different notice, taking turns among those that apply right now (`NOTICES`, each with a `when`): projects still unseen, a rod in hand, rain, night, things still to find, secrets still hidden, and a fallback. Every notice is a joke with a real tip in it (right-click or B to put the rod away, the bag, the log), worded for keyboard or touch. Villagers can reuse the same pattern.

---

## About sign and Contact mailbox: [places.ts](./places.ts), [Mailbox.tsx](./Mailbox.tsx)

```ts
export const ABOUT_AT = { x: -6, z: -2 } // places.ts: the About sign, left of the house (whole numbers, so a road reaches it)
export const CONTACT_AT = { x: -1, z: 3 } // places.ts: the Contact mailbox, out front, just left of the path from the door
const RANGE = 1.4 // Mailbox.tsx: how close the player must be for the contact card to show
const RADIUS = 0.3 // Mailbox.tsx: collision radius
```

Like the projects, the words come from [index.html](../../../index.html). Each `<p>` in `#about` is one line the sign reads out. The links in `#contact` are listed on the contact card, and the mailbox opens the first one.
