import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  base: './',
  publicDir: 'public',
  server: { port: 4600, host: '127.0.0.1', strictPort: true },
  preview: { port: 4600, host: '127.0.0.1', strictPort: true },
  resolve: {
    alias: {
      three: path.resolve(__dirname, '../node_modules/three'),
    },
  },
  optimizeDeps: {
    include: ['three'],
  },
});
