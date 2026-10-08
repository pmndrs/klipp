import { BindingModes, type BindingMode } from '@kvvasuu/klipp';
import { Aim, Body, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Group } from 'three';

import { Airplane } from '../../scene/Airplane';
import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

import { OrbitInput, orbitHint } from './OrbitInput';

export function OrbitFollowBindingMode() {
  const planeRef = useRef<Group>(null);

  const { bindingMode, damping, debug } = useControls('OrbitFollow: Binding Mode', {
    bindingMode: { value: BindingModes.lockToTargetWithWorldUp as BindingMode, options: Object.values(BindingModes) },
    damping: { value: 0.3, min: 0, max: 2, step: 0.05 },
    debug: true,
  });

  return (
    <>
      <GroundClutter layout="flightPath" />
      <Airplane ref={planeRef} />

      <Klipp>
        <VirtualCamera name="orbit-follow-binding-mode-demo" priority={10}>
          <Body.OrbitFollow
            target={planeRef}
            radius={6}
            bindingMode={bindingMode}
            damping={damping}
            debug={debug}
            horizontal={{ damping: 0.1 }}
            vertical={{ center: 20, damping: 0.1 }}
            radial={{ damping: 0.15 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={planeRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">{orbitHint}</div>
      </CanvasOverlay>
    </>
  );
}
