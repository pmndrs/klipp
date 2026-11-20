import { Extension, KlippControls, useKlipp } from '@pmndrs/klipp/react';
import type { KlippControlsThree } from '@pmndrs/klipp/three';
import { useEffect, useRef, useState } from 'react';

import { center } from '../model';

const eased = { damping: 0.15 };

/** The viewer's own camera. It comes on in the shot on screen, with its lens, so taking control starts from there. */
export function FreeLookCamera({ live }: { live: boolean }) {
  const klipp = useKlipp();
  const controls = useRef<KlippControlsThree>(null);
  const [wasLive, setWasLive] = useState(live);
  const [fov, setFov] = useState(klipp.shot.fov);

  if (live !== wasLive) {
    setWasLive(live);
    if (live) setFov(klipp.shot.fov);
  }

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
      horizontal={eased}
      vertical={eased}
      zoom={eased}
      pan={eased}
      blendThreshold={0}>
      <Extension.Lens fov={fov} />
    </KlippControls>
  );
}
