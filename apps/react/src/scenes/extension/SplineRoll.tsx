import type { SplineRollPoint } from '@pmndrs/klipp';
import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const track: [number, number, number][] = [
  [-14, 1.5, 4],
  [-14, 4, -4],
  [-9, 7, -10],
  [0, 8, -12],
  [9, 5, -10],
  [13, 2, -3],
  [8, 1.5, 3],
  [10, 3, 10],
  [0, 2, 12],
  [-9, 1.5, 11],
];

// The path is ridden in knots, so a point at 6 banks the S-bend at the seventh knot and one at 6.5 halfway out of it.
const bank: SplineRollPoint[] = [
  { position: 0, roll: 25 },
  { position: 1, roll: 30 },
  { position: 2, roll: 30 },
  { position: 3, roll: 20 },
  { position: 4, roll: 35 },
  { position: 5, roll: 45 },
  { position: 6, roll: -40 },
  { position: 6.5, roll: 0 },
  { position: 7, roll: 45 },
  { position: 8, roll: 15 },
  { position: 9, roll: 30 },
];
const flat: SplineRollPoint[] = [];

function Rails() {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(
      track.map(([x, y, z]) => new Vector3(x, y, z)),
      true,
      'centripetal',
    );
    return new TubeGeometry(curve, 400, 0.12, 8, true);
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#ff9f1c" />
    </mesh>
  );
}

export function SplineRoll() {
  const { roll, easing, speed, debug } = useControls('SplineRoll', {
    roll: true,
    easing: { value: 0, min: 0, max: 1, step: 0.05 },
    speed: { value: 0.6, min: 0.1, max: 1.5, step: 0.05, label: 'speed (knots/s)' },
    debug: true,
  });

  return (
    <>
      <GroundClutter layout="coaster" />
      <Rails />

      <Klipp>
        <VirtualCamera name="coaster" priority={10} initialState={{ fov: 70 }}>
          <Body.SplineDolly
            spline={track}
            closed
            positionUnits="knot"
            splineOffset={[0, 0.8, 0]}
            automaticDolly={{ method: 'fixedSpeed', speed }}
            debug={debug}
          />
          <Aim.SplineDollyLookAtTargets />
          <Extension.SplineRoll points={roll ? bank : flat} easing={easing} debug={debug && roll} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
