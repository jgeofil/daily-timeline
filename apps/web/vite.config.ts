import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/screenshots': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/timeline': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/voice': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/insights': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});

