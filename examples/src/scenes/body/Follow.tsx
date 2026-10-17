import type { BindingMode } from '@pmndrs/klipp';
import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import { Group } from 'three';

import { Airplane } from '../../scene/Airplane';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

export function Follow() {
  const planeRef = useRef<Group>(null);

  const { offset, damping, rotationDamping, bindingMode } = useControls('Follow', {
    offset: { x: 0, y: 0.5, z: 5 },
    damping: { value: 0, min: 0, max: 2, step: 0.05 },
    rotationDamping: { value: 0, min: 0, max: 2, step: 0.05 },
    bindingMode: {
      value: 'lockToTarget' as BindingMode,
      options: [
        'worldSpace',
        'lockToTarget',
        'lockToTargetWithWorldUp',
        'lockToTargetNoRoll',
        'lockToTargetOnAssign',
      ] as BindingMode[],
    },
  });

  return (
    <>
      <GroundClutter layout="flightPath" />
      <Airplane ref={planeRef} />

      <Klipp>
        <VirtualCamera name="follow-demo" priority={10}>
          <Body.Follow
            target={planeRef}
            offset={[offset.x, offset.y, offset.z]}
            damping={damping}
            rotationDamping={rotationDamping}
            bindingMode={bindingMode}
          />
          <Aim.HardLookAt target={planeRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
