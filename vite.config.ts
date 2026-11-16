import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The site's public address, for link previews (absolute og:image), the canonical link and the
// sitemap. SITE_URL wins if set; on Vercel it's the project's production domain, which Vercel
// provides at build time; locally it's the preview server.
const SITE_URL = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:4173')
).replace(/\/$/, '')

/** Fills %SITE_URL% in index.html and writes robots.txt and sitemap.xml next to it. */
function site(): Plugin {
  return {
    name: 'site',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL) },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc></url>\n</urlset>\n`,
      })
    },
  }
}

// The 3D code is split off automatically by the dynamic import in main.tsx.
export default defineConfig({
  plugins: [react(), site()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1100 },
})
