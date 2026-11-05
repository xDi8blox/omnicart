import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('/src/shared/threeKit')) return 'three-kit';
          if (id.includes('/src/games/')) {
            const m = id.match(/\/games\/([^/]+)/);
            if (m) return `game-${m[1]}`;
          }
        },
      },
    },
  },
  server: { port: 4500, host: true },
  preview: { port: 4500, host: true },
});
