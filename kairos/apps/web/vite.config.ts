import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // En dev local, redirige /proxy vers le Worker local (wrangler dev)
      '/proxy': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/proxy/, ''),
      },
      // API Worker (auth, profile, cv)
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
})
