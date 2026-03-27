import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ── Dev server ────────────────────────────────────────────────────────────
  server: {
    port: 3000,
    proxy: {
      '/api':      { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads':  { target: 'http://localhost:4000', changeOrigin: true },
    },
  },

  // ── Production build ──────────────────────────────────────────────────────
  build: {
    outDir:           'dist',
    emptyOutDir:      true,
    sourcemap:        false,     // no source maps in prod (security + size)
    chunkSizeWarningLimit: 600,  // warn above 600kb chunks

    rollupOptions: {
      output: {
        // Vendor chunk splitting — keeps main bundle small
        // React + ReactDOM → one vendor chunk (~140kb gzipped)
        // Zustand + Axios  → another vendor chunk (~20kb gzipped)
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          if (id.includes('node_modules/zustand') || id.includes('node_modules/axios')) {
            return 'state-vendor';
          }
        },
      },
    },
  },

  // ── Preview server (vite preview) ─────────────────────────────────────────
  preview: {
    port: 4173,
    proxy: {
      '/api':      { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads':  { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
