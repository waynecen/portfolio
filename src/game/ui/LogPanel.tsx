import { useEffect, useRef } from 'react'
import { useLog } from '../core/log'
import { useGame } from '../core/store'
import { Panel } from './Panel'

// The dialogue log: everything said this visit, newest at the bottom, so a line that went by too
// fast can be read again. Opened with L, or Log in the bag; L, Escape or × closes it.

export function LogPanel() {
  const open = useGame((s) => s.panel === 'log')
  const entries = useLog((s) => s.entries)
  const list = useRef<HTMLOListElement>(null)

  // On opening, show the newest lines and take keyboard focus, so the arrow keys scroll.
  useEffect(() => {
    if (!open || !list.current) return
    list.current.scrollTop = list.current.scrollHeight
    list.current.focus()
  }, [open])

  if (!open) return null

  return (
    <Panel title="Log" count="this visit" toggle="log">
      {entries.length ? (
        <ol ref={list} className="log-list" tabIndex={-1}>
          {entries.map((e, k) => (
            <li key={k}>
              {e.lines.map((line, n) => (
                <p key={n}>{line}</p>
              ))}
            </li>
          ))}
        </ol>
      ) : (
        <p className="log-empty">Nothing’s been said yet. Read a sign or talk to someone, and it’ll be here.</p>
      )}
    </Panel>
  )
}
