import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { Orbiter } from '../../scene/Orbiter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

export function Recomposer() {
  const ball = useRef<Mesh>(null);
  const { tilt, pan, dutch, zoomScale } = useControls('Recomposer', {
    tilt: { value: 0, min: -30, max: 30, step: 1 },
    pan: { value: 0, min: -30, max: 30, step: 1 },
    dutch: { value: 15, min: -45, max: 45, step: 1 },
    zoomScale: { value: 1, min: 0.3, max: 2, step: 0.05 },
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <Orbiter ref={ball} />

      <Klipp>
        <VirtualCamera name="recomposer-demo" priority={10}>
          <Body.HardLockToTarget target={[0, 4, 14]} />
          <Aim.HardLookAt target={ball} />
          <Extension.Recomposer tilt={tilt} pan={pan} dutch={dutch} zoomScale={zoomScale} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
