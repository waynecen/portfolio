import { useEffect } from 'react'
import { calendarLines } from '../secrets/calendar'
import { busy, say } from '../core/interact'
import { leafPiles } from './Leaves'
import { visit } from './visits'

// A word on arriving: anything the calendar has to say today (calendar.ts), and how long it's been
// since the last visit, in the island's own voice (visits.ts). Being away never costs anything: at
// most a few leaves to sweep (Leaves.tsx). Said once, a moment after the game first shows. A first
// visit hears only the calendar, since the note by the bed does the welcoming.

const DELAY = 1500 // ms after the game shows before it's said

function awayLines(): string[] {
  const d = visit.daysAway
  if (d === null || d === 0) return []
  const lines =
    d === 1
      ? ['Welcome back! The island kept your spot warm.']
      : d < 7
        ? [`Welcome back! It’s been ${d} days.`]
        : d < 30
          ? ['Welcome back! It’s been over a week.']
          : ['Welcome back! It’s been a long time. The island missed you.']
  if (leafPiles) lines.push('A few leaves blew in while you were away. Walk through them outside to sweep them up.')
  return lines
}

export function WelcomeBack() {
  useEffect(() => {
    const lines = [...calendarLines(), ...awayLines()]
    if (!lines.length) return
    let timer = 0
    const start = () => {
      timer = window.setTimeout(() => {
        if (!busy()) say(lines)
      }, DELAY)
    }
    if (document.body.dataset.view === 'game') {
      start()
      return () => clearTimeout(timer)
    }
    // Waiting on the plain page: say it once the visitor switches to the game.
    const onView = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== 'game') return
      removeEventListener('viewchange', onView)
      start()
    }
    addEventListener('viewchange', onView)
    return () => {
      removeEventListener('viewchange', onView)
      clearTimeout(timer)
    }
  }, [])
  return null
}
