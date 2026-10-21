import { Aim, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Group } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { TumblingBody } from '../../scene/TumblingBody';

const cameraPosition: [number, number, number] = [0, 2, 10];

export function RotationComposerTargetOffset() {
  const groupRef = useRef<Group>(null);

  const { offsetX, offsetY, offsetZ, damping, debug } = useControls('RotationComposer: Target Offset', {
    offsetX: { value: 1, min: -1, max: 2, step: 0.05 },
    offsetY: { value: 1, min: -1, max: 2, step: 0.05 },
    offsetZ: { value: 1, min: -1, max: 2, step: 0.05 },
    damping: { value: 0, min: 0, max: 2, step: 0.05 },
    debug: true,
  });

  const offset: [number, number, number] = [offsetX, offsetY, offsetZ];

  return (
    <>
      <GroundClutter layout="wanderInFront" />
      <TumblingBody ref={groupRef} offset={offset} />

      <Klipp>
        <VirtualCamera
          name="rotation-composer-target-offset-demo"
          priority={10}
          initialState={{ position: cameraPosition }}>
          <Aim.RotationComposer target={groupRef} targetOffset={offset} damping={damping} debug={debug} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
