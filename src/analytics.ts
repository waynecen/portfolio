// Vercel Web Analytics: cookieless page views, plus a few events, so it's clear whether visitors
// play the game or read the page, which projects they open, and whether they finish the tour. Only
// on the deployed site (never in development or on localhost), and only once Web Analytics is
// switched on for the project in Vercel, which serves the script below. No package: the same two
// lines @vercel/analytics would add. Custom events need a Vercel plan that includes them; on one
// that doesn't, they're dropped and the page views still count.

type Va = (kind: 'event' | 'beforeSend' | 'pageview', data?: unknown) => void
declare global {
  interface Window {
    va?: Va
    vaq?: unknown[][]
  }
}

const local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname)
const enabled = import.meta.env.PROD && !local

if (enabled) {
  // Calls made before the script arrives are queued, and sent once it loads.
  window.va ??= (...args) => {
    ;(window.vaq ??= []).push(args)
  }
  const s = document.createElement('script')
  s.defer = true
  s.src = '/_vercel/insights/script.js'
  document.head.appendChild(s)
}

/** Sends a custom event: a name and a few plain values (no personal data). */
export function track(name: string, data?: Record<string, string | number | boolean>) {
  if (enabled) window.va?.('event', { name, data })
}

// Links out from the page (projects, contact) count as opens too. The game's are counted where they open.
if (enabled) {
  addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('#fallback a[href]') : null
    if (a) track('Link opened', { href: a.href, from: 'page' })
  })
}
