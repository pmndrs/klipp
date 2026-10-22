import { OrthographicCamera } from '@react-three/drei';
import { useControls } from 'leva';
import { useCallback } from 'react';

import { useShortcut } from './useShortcut';

/**
 * The shared `camera` control, also switched with `O`. It outlives the examples, so the orthographic camera it makes
 * default stays the same one across them and gives the default back to the perspective camera.
 */
export function CameraSelect() {
  const [{ camera }, set] = useControls(() => ({
    camera: { value: 'perspective', options: ['perspective', 'orthographic'] },
  }));
  useShortcut(
    'KeyO',
    useCallback(() => set({ camera: camera === 'orthographic' ? 'perspective' : 'orthographic' }), [camera, set]),
  );
  return camera === 'orthographic' ? <OrthographicCamera makeDefault /> : null;
}
