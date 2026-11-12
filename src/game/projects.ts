import { snap } from './grid'

export type Project = { title: string; url: string; description: string }

// The HTML page is the single source of truth: read projects from its markup.
function readProjects(): Project[] {
  return Array.from(document.querySelectorAll('#projects article'), (el) => {
    const link = el.querySelector<HTMLAnchorElement>('h3 a')
    return {
      title: el.querySelector('h3')?.textContent?.trim() ?? '',
      url: link?.href ?? '',
      description: el.querySelector('p')?.textContent?.trim() ?? '',
    }
  })
}

export const projects = readProjects()

const RING = 5

// Stations spaced around a ring, the first one straight ahead of the spawn point, each snapped to
// the nearest grid tile.
export const stationPos = projects.map((_, i) => {
  const a = (i / projects.length) * Math.PI * 2
  return { x: snap(RING * Math.sin(a)), z: snap(-RING * Math.cos(a)) }
})
