import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The 3D code is split off automatically by the dynamic import in main.tsx.
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1100 },
})
