import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves a repo (non-user/org) site under /<repo>/, not / - the showcase is its home page at
  // /klipp/, with the examples at /klipp/examples/ and docs/ at /klipp/docs/ on the same Pages site
  base: command === 'build' ? '/klipp/' : '/',
  build: {
    rollupOptions: {
      input: {
        showcase: fileURLToPath(new URL('index.html', import.meta.url)),
        examples: fileURLToPath(new URL('examples/index.html', import.meta.url)),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      // Read the library straight from source during development - no build step in the loop.
      '@pmndrs/klipp/react/camera-controls': fileURLToPath(
        new URL('../src/react/body/camera-controls.ts', import.meta.url),
      ),
      '@pmndrs/klipp/three/camera-controls': fileURLToPath(
        new URL('../src/three/body/CameraControlsBodyThree.ts', import.meta.url),
      ),
      '@pmndrs/klipp/react': fileURLToPath(new URL('../src/react/index.ts', import.meta.url)),
      '@pmndrs/klipp/three': fileURLToPath(new URL('../src/three/index.ts', import.meta.url)),
      '@pmndrs/klipp/dom': fileURLToPath(new URL('../src/dom/index.ts', import.meta.url)),
      '@pmndrs/klipp': fileURLToPath(new URL('../src/core/index.ts', import.meta.url)),
    },
  },
}));
