import { useControls } from 'leva';

import { OrthographicSwitch } from './OrthographicSwitch';

/**
 * The shared `camera` control. It outlives the examples, so the orthographic camera it makes default stays the same
 * one across them and gives the default back to the perspective camera, not to a camera from an example left behind.
 */
export function CameraSelect() {
  const { camera } = useControls({ camera: { value: 'perspective', options: ['perspective', 'orthographic'] } });
  return <OrthographicSwitch enabled={camera === 'orthographic'} />;
}
