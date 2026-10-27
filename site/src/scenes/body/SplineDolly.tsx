import { spline, type SplinePositionUnits } from '@pmndrs/klipp';
import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { createSpline } from '@pmndrs/klipp/three';
import { useControls } from 'leva';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const knots: [number, number, number][] = [
  [-8, 2, 6],
  [-3, 3, 9],
  [3, 1.5, 8],
  [8, 2.5, 3],
  [7, 4, -4],
  [0, 3, -8],
  [-7, 2, -5],
];

export function SplineDolly() {
  const subjectRef = useRef<Mesh>(null);

  const { progress, positionUnits, damping, closed, side, up, debug } = useControls('SplineDolly', {
    progress: { value: 0, min: 0, max: 1, step: 0.001 },
    positionUnits: {
      value: 'normalized' as SplinePositionUnits,
      options: ['normalized', 'distance', 'knot'] as SplinePositionUnits[],
    },
    damping: { value: 0.5, min: 0, max: 3, step: 0.05 },
    closed: false,
    side: { value: 0, min: -3, max: 3, step: 0.1 },
    up: { value: 0, min: -2, max: 3, step: 0.1 },
    debug: true,
  });

  // The slider covers the whole path in any units, so `knot` shows its uneven pace between unevenly spaced knots.
  const end = useMemo(() => spline.maxPosition(createSpline(knots, closed), positionUnits), [closed, positionUnits]);

  return (
    <>
      <mesh ref={subjectRef} position={[0, 1.5, 0]}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#ff6b4a" />
      </mesh>
      <GroundClutter layout="standard" />

      <Klipp>
        <VirtualCamera name="spline-dolly-demo" priority={10}>
          <Body.SplineDolly
            spline={knots}
            closed={closed}
            position={progress * end}
            positionUnits={positionUnits}
            damping={damping}
            splineOffset={[side, up, 0]}
            debug={debug}
          />
          <Aim.HardLookAt target={subjectRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
