import { createRoot } from 'react-dom/client'
import { Game } from './Game'

export function mount(el: HTMLElement) {
  document.body.classList.add('playing')
  el.removeAttribute('aria-hidden')
  createRoot(el).render(<Game />)
}
