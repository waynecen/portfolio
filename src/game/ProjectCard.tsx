import { isTouch } from './quality'
import { useGame } from './store'

// Shows the focused station's project. Opening it is the station's interaction (E / Enter / A).
export function ProjectCard() {
  const project = useGame((s) => (s.dialogue || s.panel ? undefined : s.focus?.card))
  const url = project?.url

  // The live region stays mounted so screen readers announce content changes.
  return (
    <div className="project-card-region" aria-live="polite">
      {project && (
        <article className="project-card">
          <h2>{project.title}</h2>
          {project.description && <p>{project.description}</p>}
          {url && (
            <p className="project-card-action">
              <a href={url} target="_blank" rel="noopener">Open project</a>
              <span aria-hidden="true"> · press {isTouch ? 'A' : 'E'}</span>
            </p>
          )}
        </article>
      )}
    </div>
  )
}
