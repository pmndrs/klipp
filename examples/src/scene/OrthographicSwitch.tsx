import { OrthographicCamera } from '@react-three/drei';

/** While `enabled`, an orthographic camera becomes the default one, so `<Klipp>` drives it instead. */
export function OrthographicSwitch({ enabled }: { enabled: boolean }) {
  return enabled ? <OrthographicCamera makeDefault /> : null;
}
