import { useFishing } from '../fishing'
import { ITEMS, useInventory } from '../inventory'
import { isTouch } from '../core/quality'
import { SECRETS, useSecrets } from '../secrets/secrets'
import { PLACES, useSeen } from '../seen'
import { sky } from './sky'
import { winter } from './season'

// The notice board on the city square (NoticeBoard.tsx, NOTICE_AT in layout.ts): each read pins
// up a different notice, chosen from what's true right now (carrying a rod, projects not yet seen,
// rain, night, things still to find). Each is a joke with a real tip tucked into it, the way
// Smash's Palutena's Guidance hides strategy in banter. Add a notice to NOTICES: `when` says if it
// applies.

type Notice = { when: () => boolean; lines: () => string[] }

import { keyName } from '../core/keymap'

const key = (desktop: string, touch: string) => (isTouch ? touch : desktop)

const NOTICES: Notice[] = [
  {
    when: () => PLACES.some((p) => p.kind === 'project' && !useSeen.getState().seen.includes(p.id)),
    lines: () => [
      'LOST: one visitor. Last seen looking for the projects.',
      'Reward: a project for every pillar you find. Some are further out than others.',
    ],
  },
  {
    when: () => useFishing.getState().rod,
    lines: () => ['PLEASE do not poke the notice board with your fishing rod.', `${key(`Right-click (or ${keyName('bag')})`, 'A tap of B')} puts it back in the barrel.`],
  },
  {
    when: () => !winter && sky.weather.rain > 0.5,
    lines: () => ['WEATHER FORECAST: yes.', 'The fish don’t mind the rain. The dock is to the south-west.'],
  },
  {
    when: () => sky.weather.night > 0.5,
    lines: () => ['NIGHT SHIFT: the fireflies are on duty until morning.', 'The island keeps your clock: come back at another hour and the weather changes.'],
  },
  {
    when: () => useInventory.getState().found.length < ITEMS.length,
    lines: () => [
      'LOST PROPERTY: six small things, scattered. Finder may keep them.',
      `${key(`Press ${keyName('bag')}`, 'Open the menu and tap Bag')} to see what you’ve found so far.`,
    ],
  },
  {
    when: () => useSecrets.getState().found.length < SECRETS.length,
    lines: () => ['RUMOUR: odd trinkets that change the world. Harmlessly. Probably.', 'Look in quiet corners: behind things, between the trees, at the far ends.'],
  },
  {
    when: () => true,
    lines: () => ['NOTICE: there is nothing to notice. Have a nice day.', `${key(keyName('log'), 'The log, in the menu,')} shows everything that’s been said, if you missed something.`],
  },
]

let turn = 0

/** The next notice that applies right now, taking turns so a second read shows another. */
export function noticeLines(): string[] {
  const now = NOTICES.filter((n) => n.when())
  const notice = now[turn % now.length]
  turn++
  return notice.lines()
}
