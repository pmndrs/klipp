import { BlendHints } from '@pmndrs/klipp';
import { Aim, Body, VirtualCamera } from '@pmndrs/klipp/react';
import type { OrbitFollowBodyThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

import { center } from '../model';

import { overviewOrbit } from './overview';

const { radius, horizontal, vertical, sway, fov } = overviewOrbit;

/** A slow sway around the town, for the hero. */
export function OverviewCamera({ live, moving }: { live: boolean; moving: boolean }) {
  const orbit = useRef<OrbitFollowBodyThree>(null);

  useFrame(({ clock }) => {
    if (moving) orbit.current?.horizontal.setValue(horizontal + Math.sin(clock.elapsedTime * 0.15) * sway);
  });

  return (
    <VirtualCamera
      name="overview"
      priority={10}
      active={live}
      initialState={{ fov }}
      hints={BlendHints.sphericalPosition}>
      <Body.OrbitFollow
        ref={orbit}
        target={center}
        radius={radius}
        horizontal={{ center: horizontal, damping: 0.4 }}
        vertical={{ center: vertical }}
      />
      <Aim.HardLookAt target={center} />
    </VirtualCamera>
  );
}
