import { BlendHints } from '@pmndrs/klipp';
import { Aim, Body, VirtualCamera } from '@pmndrs/klipp/react';
import type { OrbitFollowBodyThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

import { center } from '../model';

import type { Orbit } from './overview';

/** A slow sway around the town on `orbit`, for the hero and the closing shot. */
export function OverviewCamera({
  name,
  orbit: { radius, horizontal, vertical, sway, fov },
  live,
  moving,
}: {
  name: string;
  orbit: Orbit;
  live: boolean;
  moving: boolean;
}) {
  const orbit = useRef<OrbitFollowBodyThree>(null);

  useFrame(({ clock }) => {
    if (moving) orbit.current?.horizontal.setValue(horizontal + Math.sin(clock.elapsedTime * 0.15) * sway);
  });

  return (
    <VirtualCamera name={name} priority={10} active={live} initialState={{ fov }} hints={BlendHints.sphericalPosition}>
      <Body.OrbitFollow
        ref={orbit}
        target={center}
        radius={radius}
        horizontal={{ center: horizontal }}
        vertical={{ center: vertical }}
      />
      <Aim.HardLookAt target={center} />
    </VirtualCamera>
  );
}
