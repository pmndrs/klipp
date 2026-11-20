import { fileURLToPath, URL } from 'node:url';

import { templateCompilerOptions } from '@tresjs/core';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions })],
  resolve: {
    alias: {
      // Read the library straight from source, so edits to src/tres/ reload without a build.
      '@pmndrs/klipp/tres': fileURLToPath(new URL('../../src/tres/index.ts', import.meta.url)),
      '@pmndrs/klipp/three': fileURLToPath(new URL('../../src/three/index.ts', import.meta.url)),
      '@pmndrs/klipp/dom': fileURLToPath(new URL('../../src/dom/index.ts', import.meta.url)),
      '@pmndrs/klipp': fileURLToPath(new URL('../../src/core/index.ts', import.meta.url)),
    },
  },
});
