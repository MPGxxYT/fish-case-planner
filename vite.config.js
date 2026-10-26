import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In development, `npm run dev:api` serves the API; on the server nginx
  // forwards /api to it instead.
  server: {
    // api/caseShape.js is also imported by the app, so Vite serves .js files
    // under /api itself instead of forwarding them.
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        bypass: (req) => (req.url.split('?')[0].endsWith('.js') ? req.url : undefined),
      },
    },
  },
  // api/ has its own tests on Node's runner (npm run test:api).
  test: {
    include: ['src/**/*.test.js'],
  },
});
