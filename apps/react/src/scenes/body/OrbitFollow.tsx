import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import type { OrbitFollowBodyThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { Crosshair } from '../../scene/Crosshair';
import { GroundClutter } from '../../scene/GroundClutter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

import { OrbitInput, orbitHint } from './OrbitInput';

export function OrbitFollow() {
  const subjectRef = useRef<Mesh>(null);
  const bodyRef = useRef<OrbitFollowBodyThree>(null);
  const valuesRef = useRef<HTMLDivElement>(null);

  const settings = useControls('OrbitFollow', {
    radius: { value: 6, min: 1, max: 20, step: 0.5 },
    axisDamping: { value: 0.1, min: 0, max: 1, step: 0.05 },
    zoomDamping: { value: 0.15, min: 0, max: 1, step: 0.05 },
    autoNormalize: true,
    autoMove: false,
    autoMoveSpeed: { value: 12, min: -60, max: 60, step: 1, render: (get) => get('OrbitFollow.autoMove') },
    debug: true,
    lockPointer: false,
  });
  const { radius, axisDamping, zoomDamping, autoNormalize, autoMove, autoMoveSpeed, debug, lockPointer } = settings;

  useFrame(() => {
    const body = bodyRef.current;
    if (!valuesRef.current || !body) return;
    const { horizontal, vertical, radial } = body;
    valuesRef.current.textContent =
      `horizontal: ${horizontal.value.toFixed(1)}°  vertical: ${vertical.value.toFixed(1)}°  ` +
      `zoom: ${Math.exp(radial.value).toFixed(2)}`;
  });

  const orthographicSize = useOrthographicSize('OrbitFollow', framingSize(6));

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />

      <Klipp>
        <VirtualCamera name="orbit-follow-demo" priority={10}>
          <Body.OrbitFollow
            ref={bodyRef}
            target={subjectRef}
            radius={radius}
            autoNormalize={autoNormalize}
            debug={debug}
            horizontal={{
              damping: axisDamping,
              autoMove: { enabled: autoMove, speed: autoMoveSpeed },
            }}
            vertical={{ center: 20, damping: axisDamping }}
            radial={{ damping: zoomDamping }}>
            <OrbitInput pointerLock={lockPointer} />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={subjectRef} />
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <Crosshair />
        <div className="pan-tilt-hud">
          {lockPointer ? 'click: lock cursor, Esc: release\nmove: orbit\nwheel: zoom' : orbitHint}
          <div ref={valuesRef} />
        </div>
      </CanvasOverlay>
    </>
  );
}
