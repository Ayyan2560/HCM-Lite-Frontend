import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optional dev proxy: if VITE_API_URL is left empty, requests to /api are
// forwarded to the backend so cookies stay same-origin during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
