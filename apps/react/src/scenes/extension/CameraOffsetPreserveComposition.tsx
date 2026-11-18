import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import type { CameraOffsetExtensionThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';

import { GroundClutter } from '../../scene/GroundClutter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const subjectPosition: [number, number, number] = [0, 1.5, 0];

export function CameraOffsetPreserveComposition() {
  const extension = useRef<CameraOffsetExtensionThree>(null);
  const { preserveComposition, crane } = useControls('CameraOffset: preserveComposition', {
    preserveComposition: true,
    crane: { value: 2.5, min: 0, max: 5, step: 0.1 },
  });

  useFrame(({ clock }) => {
    if (extension.current) extension.current.offset[1] = crane * Math.sin(clock.elapsedTime * 0.7);
  });

  const orthographicSize = useOrthographicSize('CameraOffset: preserveComposition', framingSize(8));

  return (
    <>
      <GroundClutter layout="singleSubject" />
      <SpinningSubject position={subjectPosition} />

      <Klipp>
        <VirtualCamera name="camera-offset-preserve-composition-demo" priority={10}>
          <Body.HardLockToTarget target={[0, 2.5, 8]} />
          <Aim.RotationComposer target={subjectPosition} screenPosition={[-0.4, 0.2]} debug />
          <Extension.CameraOffset ref={extension} preserveComposition={preserveComposition} />
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
