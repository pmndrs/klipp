import { BlendHints } from '@pmndrs/klipp';
import { Aim, Body, VirtualCamera } from '@pmndrs/klipp/react';

import type { Vec3 } from '../../ShowcaseProps';
import { center } from '../model';

import { lookAhead } from './lookAhead';

// Straight at the birds, over them, straight down into the alley's bend and out of it next to the cat.
const path: Vec3[] = [
  [-1.4, 3, -4.6],
  [0.55, 3.1, 0.45],
  [0.55, -0.35, 0.45],
  [0.64, -0.5, 2.08],
  [0.9, -0.5, 2.7],
];
const picked: Vec3[] = [
  [0.01, 2.79, -1.39],
  [0.6, -0.35, 0.9],
  [0.64, -0.5, 2.08],
  [0.64, -0.5, 2.08],
];
const cat: Vec3 = [1.48, -0.62, 1.9];
const end = path.length - 1;
const targets = [...lookAhead(path, picked), { position: end, lookAt: cat }];

/** Flies over the birds, dives into the alley and rides it out to the cat as `progress` goes from `0` to `1`. */
export function DiveCamera({ live, progress }: { live: boolean; progress: number }) {
  return (
    <VirtualCamera
      name="dive"
      priority={20}
      active={live}
      initialState={{ fov: 70 }}
      hints={BlendHints.sphericalPosition}>
      {/* Tracking the town's middle, so the blend in swings around the town. */}
      <Body.SplineDolly spline={path} target={center} positionUnits="knot" position={progress * end} damping={0.5} />
      <Aim.SplineDollyLookAtTargets targets={targets} easing={0.5} />
    </VirtualCamera>
  );
}
