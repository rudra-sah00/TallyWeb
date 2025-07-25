import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/tally': {
        target: 'http://117.214.47.40:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tally/, ''),
        timeout: 120000, // 2 minutes timeout for Tally API
        proxyTimeout: 120000, // 2 minutes proxy timeout
      }
    }
  }
});
