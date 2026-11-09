import { useEffect } from 'react'
import { bindInteract } from './input'
import { projects } from './projects'
import { useGame } from './store'

export function ProjectCard() {
  const active = useGame((s) => s.active)
  const project = active === null ? null : projects[active]
  const url = project?.url

  useEffect(() => {
    if (!url) return
    return bindInteract(() => window.open(url, '_blank', 'noopener'))
  }, [url])

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
              <span aria-hidden="true"> · press E</span>
            </p>
          )}
        </article>
      )}
    </div>
  )
}
