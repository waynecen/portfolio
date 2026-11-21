import { useGame } from './store'

/** Full-screen black that fades in and out while the player moves between areas (see scene.ts). */
export function Fade() {
  const fading = useGame((s) => s.fading)
  return <div className={fading ? 'fade fade-on' : 'fade'} aria-hidden="true" />
}
