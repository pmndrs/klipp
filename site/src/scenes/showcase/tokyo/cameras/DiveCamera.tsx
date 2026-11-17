import { Aim, Body, Extension, Noise, VirtualCamera } from '@pmndrs/klipp/react';

import type { Vec3 } from '../../ShowcaseProps';
import { center } from '../model';

import { arrivalAt, diveDamping, diveEnd, divePath, dropAt } from './dive';
import { overviewOrbit } from './overview';

// Starts on the town's middle like the hero's camera, so the dive takes over its shot.
const looks: { position: number; lookAt: Vec3 }[] = [
  { position: 0, lookAt: center },
  { position: 1, lookAt: [0, 2.5, 0] },
  { position: 2, lookAt: [0.5, -0.35, 0.54] },
  { position: 3, lookAt: [0.6, -0.35, 0.9] },
  { position: 4, lookAt: [0.65, -1.35, 3.75] },
  { position: 5, lookAt: [1.48, -0.62, 1.9] },
  { position: 6, lookAt: [1.48, -0.62, 1.9] },
];
const tension = [0, 0, 0, 0.2, 0, 0.5, 0];

// The view opens up from the hero's lens on the way in, widens and shakes on the way down and settles at the bottom.
const fov = 70;
const dropFov = 110;
const shakeAmplitude: Vec3 = [1.5, 1.5, 0.8];
const shakeFrequency: Vec3 = [4, 4, 4];

/** Flies in from the hero's shot, dives into the alley and rides it out to the cat as `progress` goes from `0` to `1`. */
export function DiveCamera({ live, progress }: { live: boolean; progress: number }) {
  const drop = dropAt(progress);
  const lensFov = overviewOrbit.fov + (fov - overviewOrbit.fov) * arrivalAt(progress) + (dropFov - fov) * drop;
  return (
    <VirtualCamera name="dive" priority={20} active={live} initialState={{ fov: overviewOrbit.fov }}>
      <Body.SplineDolly
        spline={divePath}
        tension={tension}
        target={center}
        positionUnits="knot"
        position={progress * diveEnd}
        damping={diveDamping}
      />
      <Aim.SplineDollyLookAtTargets targets={looks} easing={0.5} />
      <Extension.Lens fov={lensFov} fovDamping={diveDamping} />
      <Noise.BasicMultiChannelPerlin
        rotationAmplitude={shakeAmplitude}
        rotationFrequency={shakeFrequency}
        amplitudeGain={drop}
        amplitudeDamping={diveDamping}
      />
    </VirtualCamera>
  );
}
