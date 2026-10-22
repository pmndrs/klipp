import { OrthographicCamera } from '@react-three/drei';
import { useControls } from 'leva';

/**
 * The shared `camera` control. It outlives the examples, so the orthographic camera it makes default stays the same
 * one across them and gives the default back to the perspective camera, not to a camera from an example left behind.
 */
export function CameraSelect() {
  const { camera } = useControls({ camera: { value: 'perspective', options: ['perspective', 'orthographic'] } });
  return camera === 'orthographic' ? <OrthographicCamera makeDefault /> : null;
}
