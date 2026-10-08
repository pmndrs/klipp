import { BindingModes } from '@kvvasuu/klipp';
import { Aim, Body, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Group } from 'three';

import { Airplane } from '../../scene/Airplane';
import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

import { OrbitInput, orbitHint } from './OrbitInput';

export function OrbitFollowDampedAim() {
  const planeRef = useRef<Group>(null);

  const { damping, aimDamping, debug } = useControls('OrbitFollow: Damped Aim', {
    damping: { value: 1, min: 0, max: 2, step: 0.05 },
    aimDamping: { value: 0.5, min: 0, max: 2, step: 0.05 },
    debug: true,
  });

  return (
    <>
      <GroundClutter layout="flightPath" />
      <Airplane ref={planeRef} />

      <Klipp>
        <VirtualCamera name="orbit-follow-damped-aim-demo" priority={10}>
          <Body.OrbitFollow
            target={planeRef}
            radius={6}
            bindingMode={BindingModes.lockToTargetWithWorldUp}
            damping={damping}
            debug={debug}
            vertical={{ center: 20 }}
            radial={{ damping: 0.15 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.RotationComposer target={planeRef} damping={aimDamping} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">{orbitHint}</div>
      </CanvasOverlay>
    </>
  );
}
