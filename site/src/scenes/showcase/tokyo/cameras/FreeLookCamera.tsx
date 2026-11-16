import { KlippControls, useKlipp } from '@pmndrs/klipp/react';
import type { KlippControlsThree } from '@pmndrs/klipp/three';
import { useEffect, useRef } from 'react';

import { center } from '../model';

/** The viewer's own camera. It comes on in the shot on screen, so taking control starts from there. */
export function FreeLookCamera({ live }: { live: boolean }) {
  const klipp = useKlipp();
  const controls = useRef<KlippControlsThree>(null);

  useEffect(() => {
    if (!live) return;
    const { position, lookAtTarget, hasLookAtTarget } = klipp.shot;
    if (hasLookAtTarget) controls.current?.setLookAt(position, lookAtTarget);
  }, [live, klipp]);

  return (
    <KlippControls
      ref={controls}
      name="free-look"
      priority={100}
      active={live}
      target={center}
      distance={6}
      initialState={{ fov: 75 }}
      blendThreshold={0.6}
    />
  );
}
