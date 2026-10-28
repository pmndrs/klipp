import { BlendCurves, type SequencerInstruction } from '@pmndrs/klipp';
import { Aim, Body, Klipp, SequencerCamera, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

type Vec3 = [number, number, number];

const subjectPosition: Vec3 = [0, 1.5, 0];

const shots: { name: string; knots: Vec3[]; duration: number }[] = [
  {
    name: 'sweep',
    knots: [
      [-7, 1, 5],
      [-3, 0.8, 7.5],
      [3, 0.8, 7.5],
      [7, 1, 5],
    ],
    duration: 5,
  },
  {
    name: 'crane',
    knots: [
      [5, 0.8, -5],
      [5.5, 3, -5.5],
      [5, 6.5, -6.5],
    ],
    duration: 4,
  },
  {
    name: 'flyby',
    knots: [
      [-12, 4, -3],
      [0, 3, -8],
      [12, 4, -3],
    ],
    duration: 5,
  },
];

export function SplineDollySequence() {
  const subjectRef = useRef<Mesh>(null);

  const { blendTime, debug } = useControls('SplineDolly: Sequence', {
    blendTime: { value: 0, min: 0, max: 3, step: 0.1 },
    debug: true,
  });

  // Each shot moves on as its own move ends, so the blend out starts while the camera still rides it.
  const instructions: SequencerInstruction[] = shots.map(({ name, duration }) => ({
    camera: name,
    hold: Math.max(0, duration - blendTime),
    blend: { curve: blendTime > 0 ? BlendCurves.easeInOut : BlendCurves.cut, time: blendTime },
  }));

  return (
    <>
      <mesh ref={subjectRef} position={subjectPosition}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#ff6b4a" />
      </mesh>
      <GroundClutter layout="standard" />

      <Klipp>
        <SequencerCamera name="spline-dolly-sequence" loop instructions={instructions}>
          {shots.map(({ name, knots, duration }) => (
            <VirtualCamera key={name} name={name}>
              <Body.SplineDolly
                spline={knots}
                automaticDolly={{ method: 'duration', from: 0, to: 1, duration, curve: BlendCurves.easeInOut }}
                debug={debug}
              />
              <Aim.HardLookAt target={subjectRef} />
              <SpectatorFrustum />
            </VirtualCamera>
          ))}
        </SequencerCamera>
      </Klipp>
    </>
  );
}
