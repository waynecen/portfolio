import { createRoot } from 'react-dom/client'
import { Game } from './Game'

export function mount(el: HTMLElement) {
  createRoot(el).render(<Game />)
}
