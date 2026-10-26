import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In development, `npm run dev:api` serves the API; on the server nginx
  // forwards /api to it instead.
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
});
