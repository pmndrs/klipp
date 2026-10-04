import { isAbsolute } from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: [
        'src/core/index.ts',
        'src/three/index.ts',
        'src/three/body/CameraControlsBodyThree.ts',
        'src/react/index.ts',
        'src/react/body/camera-controls.ts',
        'src/dom/index.ts',
      ],
      formats: ['es'],
    },
    target: 'es2023',
    minify: false,
    rolldownOptions: {
      // Dependencies and peers stay imports, so apps share one copy of three, React and math.
      external: (id) => !id.startsWith('.') && !isAbsolute(id),
      output: {
        // One output file per source file, so `dist` mirrors `src` and the package exports stay the same.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
