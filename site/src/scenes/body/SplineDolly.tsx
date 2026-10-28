import {
  BlendCurves,
  spline,
  type SplineAutomaticDolly,
  type SplineDollyLoop,
  type SplinePositionUnits,
} from '@pmndrs/klipp';
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

type Method = 'none' | SplineAutomaticDolly['method'];

const isMethod = (method: Method) => (get: (path: string) => unknown) => get('SplineDolly.automaticDolly') === method;

export function SplineDolly() {
  const subjectRef = useRef<Mesh>(null);

  const {
    automaticDolly,
    progress,
    speed,
    duration,
    loop,
    easeInOut,
    positionUnits,
    damping,
    closed,
    side,
    up,
    debug,
  } = useControls('SplineDolly', {
    automaticDolly: { value: 'fixedSpeed' as Method, options: ['none', 'fixedSpeed', 'duration'] as Method[] },
    progress: { value: 0, min: 0, max: 1, step: 0.001, render: isMethod('none') },
    speed: { value: 0.1, min: -0.5, max: 0.5, step: 0.01, label: 'speed (path/s)', render: isMethod('fixedSpeed') },
    duration: { value: 6, min: 0.5, max: 20, step: 0.5, render: isMethod('duration') },
    loop: {
      value: 'pingPong' as SplineDollyLoop,
      options: ['once', 'loop', 'pingPong'] as SplineDollyLoop[],
      render: isMethod('duration'),
    },
    easeInOut: { value: true, render: isMethod('duration') },
    positionUnits: {
      value: 'normalized' as SplinePositionUnits,
      options: ['normalized', 'distance', 'knot'] as SplinePositionUnits[],
    },
    damping: { value: 0.5, min: 0, max: 3, step: 0.05 },
    closed: true,
    side: { value: 0, min: -3, max: 3, step: 0.1 },
    up: { value: 0, min: -2, max: 3, step: 0.1 },
    debug: true,
  });

  // The controls cover the whole path in any units, so `knot` shows its uneven pace between unevenly spaced knots.
  const end = useMemo(() => spline.maxPosition(createSpline(knots, closed), positionUnits), [closed, positionUnits]);
  const dolly: SplineAutomaticDolly | null =
    automaticDolly === 'fixedSpeed'
      ? { method: 'fixedSpeed', speed: speed * end }
      : automaticDolly === 'duration'
        ? {
            method: 'duration',
            from: 0,
            to: end,
            duration,
            loop,
            curve: easeInOut ? BlendCurves.easeInOut : BlendCurves.linear,
          }
        : null;

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
            automaticDolly={dolly}
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
