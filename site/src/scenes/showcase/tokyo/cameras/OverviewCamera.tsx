import { BlendHints } from '@pmndrs/klipp';
import { Aim, Body, VirtualCamera } from '@pmndrs/klipp/react';
import type { OrbitFollowBodyThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

import { center } from '../model';

/** A slow sway around the town, for the hero. */
export function OverviewCamera({ live, moving }: { live: boolean; moving: boolean }) {
  const orbit = useRef<OrbitFollowBodyThree>(null);

  useFrame(({ clock }) => {
    if (moving) orbit.current?.horizontal.setValue(-32 + Math.sin(clock.elapsedTime * 0.15) * 12);
  });

  return (
    <VirtualCamera
      name="overview"
      priority={10}
      active={live}
      initialState={{ fov: 40 }}
      hints={BlendHints.sphericalPosition}>
      <Body.OrbitFollow
        ref={orbit}
        target={center}
        radius={9.5}
        horizontal={{ center: -32, damping: 0.4 }}
        vertical={{ center: 12 }}
      />
      <Aim.HardLookAt target={center} />
    </VirtualCamera>
  );
}
