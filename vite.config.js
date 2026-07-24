import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The built bundle is served by each SDK example's own backend at the
// contract's default port (8091). Assets are referenced relatively so the
// bundle can be unpacked and served from any path (.frontend/<tag>/).
export default defineConfig({
  base: './',
  plugins: [react()],
  // In `npm run dev` Vite serves the app on its OWN origin, but the demo backend
  // (CONTRACT.md) — including every `/api/*` route the app fetches relatively —
  // runs on the contract's default port (8091). Proxy `/api` there so the
  // documented dev run reaches a running SDK example without CORS/origin juggling.
  // (The built bundle is served BY the backend on one origin, so it needs no proxy.)
  server: {
    proxy: {
      '/api': 'http://localhost:8091'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Keep the bundle self-contained: no code-splitting surprises for a
    // backend that serves a fixed set of files.
    sourcemap: false
  }
});
