import type { InputControllerDom } from '@kvvasuu/klipp/dom';
import { Aim, Body, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import type { OrbitFollowBodyThree } from '@kvvasuu/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { Crosshair } from '../../scene/Crosshair';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';
import { usePointerLock } from '../../scene/usePointerLock';

import { OrbitInput, orbitHint } from './OrbitInput';

export function OrbitFollow() {
  const subjectRef = useRef<Mesh>(null);
  const bodyRef = useRef<OrbitFollowBodyThree>(null);
  const controllerRef = useRef<InputControllerDom>(null);
  const valuesRef = useRef<HTMLDivElement>(null);

  const { radius, axisDamping, zoomDamping, debug, lockPointer } = useControls('OrbitFollow', {
    radius: { value: 6, min: 1, max: 20, step: 0.5 },
    axisDamping: { value: 0.1, min: 0, max: 1, step: 0.05 },
    zoomDamping: { value: 0.15, min: 0, max: 1, step: 0.05 },
    debug: true,
    lockPointer: false,
  });

  const locked = usePointerLock(controllerRef, lockPointer);

  useFrame(() => {
    const body = bodyRef.current;
    if (!valuesRef.current || !body) return;
    const { horizontal, vertical, radial } = body;
    valuesRef.current.textContent =
      `horizontal: ${horizontal.value.toFixed(1)}°  vertical: ${vertical.value.toFixed(1)}°  ` +
      `zoom: ${Math.exp(radial.value).toFixed(2)}`;
  });

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
            debug={debug}
            horizontal={{ damping: axisDamping }}
            vertical={{ center: 20, damping: axisDamping }}
            radial={{ damping: zoomDamping }}>
            <OrbitInput ref={controllerRef} />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={subjectRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        {locked && <Crosshair />}
        <div className="pan-tilt-hud">
          {lockPointer ? 'left-click: lock cursor\nmove: orbit\nwheel: zoom' : orbitHint}
          <div ref={valuesRef} />
        </div>
      </CanvasOverlay>
    </>
  );
}
