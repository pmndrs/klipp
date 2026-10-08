import type { RecenteringTarget } from '@kvvasuu/klipp';
import { Aim, Body, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Group } from 'three';

import { Airplane } from '../../scene/Airplane';
import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

import { OrbitInput, orbitHint } from './OrbitInput';

export function OrbitFollowRecentering() {
  const planeRef = useRef<Group>(null);

  const { recenteringTarget, wait, time } = useControls('OrbitFollow: Recentering', {
    recenteringTarget: {
      value: 'trackingTarget' as RecenteringTarget,
      options: ['trackingTarget', 'axisCenter'] as RecenteringTarget[],
    },
    wait: { value: 0.3, min: 0, max: 5, step: 0.1 },
    time: { value: 0.3, min: 0.1, max: 3, step: 0.1 },
  });
  const recentering = { enabled: true, wait, time };

  return (
    <>
      <GroundClutter layout="flightPath" />
      <Airplane ref={planeRef} />

      <Klipp>
        <VirtualCamera name="orbit-follow-recentering-demo" priority={10}>
          <Body.OrbitFollow
            target={planeRef}
            radius={6}
            recenteringTarget={recenteringTarget}
            debug
            horizontal={{ damping: 0.1, recentering }}
            vertical={{ center: 20, damping: 0.1, recentering }}
            radial={{ damping: 0.15 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={planeRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">{`${orbitHint}\nlet go and wait: the camera eases back`}</div>
      </CanvasOverlay>
    </>
  );
}
