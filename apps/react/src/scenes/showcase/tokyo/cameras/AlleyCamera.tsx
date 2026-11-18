import { BlendHints } from '@pmndrs/klipp';
import { Aim, Body, Noise, VirtualCamera } from '@pmndrs/klipp/react';
import type { SplineDollyBodyThree } from '@pmndrs/klipp/three';
import { useRef } from 'react';

import type { Vec3 } from '../../ShowcaseProps';

import { useArrival } from './useArrival';

// Picked in free look: the camera's spots from in front of the alley to its exit, and where it looks at each.
const path: Vec3[] = [
  [0.64, -0.5, 2.08],
  [0.4, -0.32, 0.5],
  [1.32, -0.6, -0.1],
  [2.42, -0.6, -0.15],
  [2.42, -0.6, -0.5],
];
const looks: { position: number; lookAt: Vec3 }[] = [
  { position: 0, lookAt: [0.66, -0.43, 0.09] },
  { position: 1, lookAt: [2.2, -0.55, -1.22] },
  { position: 2, lookAt: [2.31, -0.46, -1] },
  { position: 3, lookAt: [2.5, -0.67, -1.93] },
  { position: 4, lookAt: [2.5, -0.67, -1.93] },
];
const end = path.length - 1;

/**
 * Rides the alley from its entrance to its exit as `progress` goes from `0` to `1`, and comes on where it points.
 * While `finishing`, `onArrive` tells when the camera has caught up with `progress`.
 */
export function AlleyCamera({
  live,
  progress,
  finishing,
  onArrive,
}: {
  live: boolean;
  progress: number;
  finishing: boolean;
  onArrive: () => void;
}) {
  const dolly = useRef<SplineDollyBodyThree>(null);
  useArrival(dolly, finishing, onArrive);
  return (
    <VirtualCamera
      name="alley"
      priority={20}
      active={live}
      initialState={{ fov: 80 }}
      hints={BlendHints.sphericalPosition}>
      <Body.SplineDolly ref={dolly} spline={path} positionUnits="knot" position={progress * end} damping={0.75} />
      <Aim.SplineDollyLookAtTargets targets={looks} easing={0.5} />
      <Noise.BasicMultiChannelPerlin
        positionAmplitude={[0.025, 0.025, 0.025]}
        positionFrequency={[0.35, 0.35, 0.35]}
        amplitudeGain={1}
        frequencyGain={1}
      />
    </VirtualCamera>
  );
}
