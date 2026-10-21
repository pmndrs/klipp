import { Aim, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { Orbiter, orbiterLoopRadius } from '../../scene/Orbiter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const cameraPosition: [number, number, number] = [0, 5, 15];

export function RotationComposerLookahead() {
  const orbiterRef = useRef<Mesh>(null);

  const { lookaheadTime, lookaheadSmoothing, lookaheadIgnoreY, debug } = useControls('RotationComposer: Lookahead', {
    lookaheadTime: { value: 0.5, min: 0, max: 1.5, step: 0.05 },
    lookaheadSmoothing: { value: 1, min: 0.05, max: 3, step: 0.05 },
    lookaheadIgnoreY: false,
    debug: true,
  });

  const orthographicSize = useOrthographicSize('RotationComposer: Lookahead', framingSize(15));

  return (
    <>
      <GroundClutter layout="standard" />
      <Orbiter ref={orbiterRef} />

      <Klipp>
        <VirtualCamera
          name="rotation-composer-lookahead-demo"
          priority={10}
          initialState={{ position: cameraPosition }}>
          <Aim.RotationComposer
            target={orbiterRef}
            lookaheadTime={lookaheadTime}
            lookaheadSmoothing={lookaheadSmoothing}
            lookaheadIgnoreY={lookaheadIgnoreY}
            debug={debug}
          />
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum maxDistance={cameraPosition[2] + orbiterLoopRadius + 4} />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
