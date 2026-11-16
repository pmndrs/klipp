import { BlendHints } from '@pmndrs/klipp';
import { Aim, Body, Noise, VirtualCamera } from '@pmndrs/klipp/react';
import { Vector3 } from 'three';

import type { Vec3 } from '../../ShowcaseProps';

// Picked in free look: the camera's spots from in front of the alley to its exit, and where it looks at each.
const path: Vec3[] = [
  [0.64, -0.5, 2.08],
  [0.4, -0.32, 0.5],
  [1.32, -0.6, -0.1],
  [2.42, -0.6, -0.3],
];
const picked: Vec3[] = [
  [0.66, -0.43, 0.09],
  [0.8, -0.37, 0.12],
  [2.31, -0.46, -1],
  [2.42, -0.54, -1],
];
const looks = picked.map((point, position) => {
  // Same direction, pushed far ahead: a camera riding past the point it looks at would flip around.
  const from = new Vector3(...path[position]);
  const direction = new Vector3(...point).sub(from);
  // A point picked on the knot itself gives no direction, so it looks the way the path comes in.
  if (direction.lengthSq() < 1e-6) direction.copy(from).sub(new Vector3(...path[position - 1]));
  return { position, lookAt: direction.setLength(3).add(from).toArray() };
});
const end = path.length - 1;

/** Rides the alley from its entrance to its exit as `progress` goes from `0` to `1`, and comes on where it points. */
export function AlleyCamera({ live, progress }: { live: boolean; progress: number }) {
  return (
    <VirtualCamera
      name="alley"
      priority={20}
      active={live}
      initialState={{ fov: 80 }}
      hints={BlendHints.sphericalPosition}>
      <Body.SplineDolly spline={path} positionUnits="knot" position={progress * end} damping={0.5} />
      <Aim.SplineDollyLookAtTargets targets={looks} easing={0.5} />
      <Noise.BasicMultiChannelPerlin
        positionAmplitude={[0.05, 0.05, 0.05]}
        positionFrequency={[0.35, 0.35, 0.35]}
        amplitudeGain={1}
        frequencyGain={1}
      />
    </VirtualCamera>
  );
}
