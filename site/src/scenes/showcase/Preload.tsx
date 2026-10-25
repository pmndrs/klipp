import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';

// A stalled compile, like one in a minimized tab, must not keep the scene hidden forever.
const COMPILE_TIMEOUT_MS = 8000;
// Gives the first frames time to upload textures and prefilter the environment before the scene shows.
const SETTLE_MS = 500;

export function Preload({ onReady }: { onReady: () => void }) {
  const renderer = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  useLayoutEffect(() => {
    let cancelled = false;
    let readyTimeout: ReturnType<typeof setTimeout> | undefined;

    const preload = async () => {
      await Promise.race([
        renderer.compileAsync(scene, camera),
        new Promise((resolve) => setTimeout(resolve, COMPILE_TIMEOUT_MS)),
      ]);
      if (cancelled) return;

      readyTimeout = setTimeout(onReady, SETTLE_MS);
    };
    void preload();

    return () => {
      cancelled = true;
      clearTimeout(readyTimeout);
    };
  }, [renderer, camera, scene, onReady]);

  return null;
}
