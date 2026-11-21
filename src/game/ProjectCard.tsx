import { isTouch } from './quality'
import { useGame } from './store'
import { keyName } from './keymap'

// Shows the focused interactable's card: a station's project, or the mailbox's contact links.
// Using the interactable (E / Enter / A) opens the card's url.
export function ProjectCard() {
  const card = useGame((s) => (s.dialogue || s.panel ? undefined : s.focus?.card))
  const url = card?.url
  const action = card?.action ?? 'Open project'

  // The live region stays mounted so screen readers announce content changes.
  return (
    <div className="project-card-region" aria-live="polite">
      {card && (
        <article className="project-card">
          <h2>{card.title}</h2>
          {card.description && <p>{card.description}</p>}
          {card.links && card.links.length > 0 && (
            <ul className="project-card-links">
              {card.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener">{l.label}</a>
                </li>
              ))}
            </ul>
          )}
          {url && (
            <p className="project-card-action">
              {/* With a list of links the action is already among them, so here it's only the key hint. */}
              {card.links ? action : <a href={url} target="_blank" rel="noopener">{action}</a>}
              <span aria-hidden="true"> · press {isTouch ? 'A' : keyName('interact')}</span>
            </p>
          )}
        </article>
      )}
    </div>
  )
}
