import { Aim, Body, Extension, Noise, VirtualCamera } from '@pmndrs/klipp/react';

import type { Vec3 } from '../../ShowcaseProps';
import { center } from '../model';

import { diveDamping, diveEnd, divePath, dropAt } from './dive';

const looks: { position: number; lookAt: Vec3 }[] = [
  { position: 0, lookAt: [1.2, 2.79, 1.2] },
  { position: 1, lookAt: [0.6, -0.35, 0.9] },
  { position: 2, lookAt: [0.65, -0.5, 0.9] },
  { position: 3, lookAt: [0.55, -0.6, 3.9] },
  { position: 4, lookAt: [1.48, -0.62, 1.9] },
];
const tension = [0, 0.2, 0, 0.5, 0, 0];

// The view widens and shakes on the way down and settles at the bottom.
const fov = 70;
const dropFov = 110;
const shakeAmplitude: Vec3 = [1.5, 1.5, 0.8];
const shakeFrequency: Vec3 = [4, 4, 4];

/** Flies over the birds, dives into the alley and rides it out to the cat as `progress` goes from `0` to `1`. */
export function DiveCamera({ live, progress }: { live: boolean; progress: number }) {
  const drop = dropAt(progress);
  return (
    <VirtualCamera name="dive" priority={20} active={live} initialState={{ fov }}>
      <Body.SplineDolly
        spline={divePath}
        tension={tension}
        target={center}
        positionUnits="knot"
        position={progress * diveEnd}
        damping={diveDamping}
      />
      <Aim.SplineDollyLookAtTargets targets={looks} easing={0.5} />
      <Extension.Lens fov={fov + (dropFov - fov) * drop} fovDamping={diveDamping} />
      <Noise.BasicMultiChannelPerlin
        rotationAmplitude={shakeAmplitude}
        rotationFrequency={shakeFrequency}
        amplitudeGain={drop}
        amplitudeDamping={diveDamping}
      />
    </VirtualCamera>
  );
}
