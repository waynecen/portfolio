import { currentHour } from './sky'
import { visit } from './visits'

// The real calendar, noticed: a line on the island's birthday and a few holidays, small decorations
// by the front door on some of them (Festive.tsx), a word on round-numbered visits, and one gentle
// joke for anyone reading the About sign in the small hours. Never more than a line or a prop: it
// changes nothing the visitor has done. Add ?date=MM-DD to the URL to try a given day.

/** The island's birthday: the day the site went up. A placeholder; change it to the real day. */
export const ISLAND_BIRTHDAY = { month: 11, day: 20 }

const MILESTONES = [10, 25, 50, 100] // visits worth a word
const NIGHT = [2, 5] // hours (from, to) when the About sign asks if you shouldn't be asleep

export type Holiday = 'birthday' | 'newYear' | 'valentine' | 'halloween' | 'christmas' | 'newYearsEve'

function today() {
  const forced = new URLSearchParams(location.search).get('date')?.match(/^(\d{1,2})-(\d{1,2})$/)
  if (forced) return { month: +forced[1], day: +forced[2] }
  const d = new Date()
  return { month: d.getMonth() + 1, day: d.getDate() }
}

const { month, day } = today()

/** Today's holiday on the island, if any. */
export const holiday: Holiday | null =
  month === ISLAND_BIRTHDAY.month && day === ISLAND_BIRTHDAY.day
    ? 'birthday'
    : month === 1 && day === 1
      ? 'newYear'
      : month === 2 && day === 14
        ? 'valentine'
        : month === 10 && day === 31
          ? 'halloween'
          : month === 12 && (day === 24 || day === 25)
            ? 'christmas'
            : month === 12 && day === 31
              ? 'newYearsEve'
              : null

const HOLIDAY_LINES: Record<Holiday, string> = {
  birthday: 'It’s the island’s birthday today! Thanks for coming to the party.',
  newYear: 'Happy New Year! The island’s glad you started it here.',
  valentine: 'Happy Valentine’s Day! The island’s glad you dropped by.',
  halloween: 'Happy Halloween! The pumpkins by the door are only a little bit haunted.',
  christmas: 'Merry Christmas! There are presents by the front door. They’re for looking at.',
  newYearsEve: 'It’s the last day of the year. Thanks for spending a bit of it here.',
}

/** What the calendar has to say on arriving: today's holiday and any round-numbered visit. */
export function calendarLines(): string[] {
  const lines: string[] = []
  if (holiday) lines.push(HOLIDAY_LINES[holiday])
  if (MILESTONES.includes(visit.count)) lines.push(`This is your ${visit.count}th visit to the island. Thank you for coming back!`)
  return lines
}

/** True in the small hours, when the About sign has a question before its words. */
export function lateNight() {
  const h = currentHour()
  return h >= NIGHT[0] && h < NIGHT[1]
}
