import type { MixingCamera as MixingCameraCore } from '@pmndrs/klipp';
import { Aim, Body, Klipp, MixingCamera as Mixing, VirtualCamera } from '@pmndrs/klipp/react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef, useState } from 'react';

import { GroundClutter } from '../../scene/GroundClutter';
import { addOffset, lookAtQuaternion } from '../../scene/lookAtQuaternion';
import { framingSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

import { MixShares } from './MixShares';

const subjectPosition: [number, number, number] = [0, 1.5, 0];

const shots = ['wide', 'side', 'top'] as const;
type Shot = (typeof shots)[number];

const offsets: Record<Shot, [number, number, number]> = {
  wide: [-2, 3, 10],
  side: [8, 1, 1],
  top: [0.5, 9, 1],
};

const colors: Record<Shot, string> = { wide: '#21a9e0', side: '#7ed957', top: '#c77dff' };

const weight = (value: number) => ({ value, min: 0, max: 1, step: 0.01 });

function initialStateOf(shot: Shot) {
  const position = addOffset(subjectPosition, offsets[shot]);
  return {
    position,
    quaternion: lookAtQuaternion(position, subjectPosition),
    orthographicSize: framingSize(Math.hypot(...offsets[shot])),
  };
}

export function MixingCamera() {
  const mix = useRef<MixingCameraCore>(null);
  const [weights] = useState<Record<Shot, number>>(() => ({ wide: 1, side: 0, top: 0 }));
  const controls = useControls('MixingCamera', {
    animate: false,
    wide: weight(1),
    side: weight(0),
    top: weight(0),
  });

  const time = useRef(0);
  useFrame((_, delta) => {
    const current = mix.current?.weights;
    if (!current) return;
    if (controls.animate) time.current += delta;
    shots.forEach((shot, i) => {
      current[shot] = controls.animate
        ? 0.5 + 0.5 * Math.sin(time.current * 0.6 + (i * 2 * Math.PI) / shots.length)
        : controls[shot];
    });
  });

  return (
    <>
      <SpinningSubject position={subjectPosition} />
      <GroundClutter layout="singleSubject" />

      <Klipp>
        <MixShares mix={mix} colors={colors} />

        <Mixing ref={mix} name="mix" weights={weights}>
          {shots.map((shot) => (
            <VirtualCamera key={shot} name={shot} initialState={initialStateOf(shot)}>
              <Body.Follow target={subjectPosition} offset={offsets[shot]} bindingMode="worldSpace" />
              <Aim.HardLookAt target={subjectPosition} />
              <SpectatorFrustum color={colors[shot]} />
            </VirtualCamera>
          ))}
        </Mixing>
      </Klipp>
    </>
  );
}
