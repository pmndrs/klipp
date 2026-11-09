import type { InputControllerDom } from '@pmndrs/klipp/dom';
import { Aim, Extension, InputController, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import type { PanTiltAimThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { button, useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { Crosshair } from '../../scene/Crosshair';
import { GroundClutter } from '../../scene/GroundClutter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { usePointerLock } from '../../scene/usePointerLock';

const degreesPerPixel = 0.15;
const lookSource = { axes: { x: 'pan', y: 'tilt' }, gain: degreesPerPixel };

export function PanTilt() {
  const controllerRef = useRef<InputControllerDom>(null);
  const aimRef = useRef<PanTiltAimThree>(null);
  const panValueRef = useRef<HTMLDivElement>(null);
  const pillarRef = useRef<Mesh>(null);

  const { lockPointer, damping, maxSpeed, autoNormalize } = useControls('PanTilt', {
    lockPointer: false,
    damping: { value: 0.1, min: 0, max: 2, step: 0.05 },
    maxSpeed: { value: 5000, min: 10, max: 10000, step: 10 },
    autoNormalize: true,
  });

  useControls('PanTilt', () => ({
    'look at a new pillar': button(() => {
      const pillar = pillarRef.current;
      if (!pillar) return;
      const angle = Math.random() * Math.PI * 2;
      pillar.position.set(Math.sin(angle) * 10, 1.5, -Math.cos(angle) * 10);
      aimRef.current?.lookAt(pillar.position, { damping: 0.5 });
    }),
  }));

  const locked = usePointerLock(controllerRef, lockPointer);

  useFrame(() => {
    if (!panValueRef.current || !aimRef.current) return;
    const { pan, tilt } = aimRef.current;
    panValueRef.current.textContent = `pan.value: ${pan.value.toFixed(1)}°  tilt.value: ${tilt.value.toFixed(1)}°`;
  });

  const orthographicSize = useOrthographicSize('PanTilt', framingSize(10));

  return (
    <>
      <GroundClutter layout="standard" />
      <mesh ref={pillarRef} position={[0, 1.5, 10]}>
        <cylinderGeometry args={[0.3, 0.3, 3, 12]} />
        <meshStandardMaterial color="#ff6b4a" emissive="#ff6b4a" emissiveIntensity={0.3} />
      </mesh>

      <Klipp>
        <VirtualCamera name="pan-tilt-demo" priority={10} initialState={{ position: [0, 2, 0] }}>
          <Aim.PanTilt
            ref={aimRef}
            pan={{ damping, maxSpeed }}
            tilt={{ damping, maxSpeed }}
            autoNormalize={autoNormalize}>
            <InputController
              ref={controllerRef}
              mouseButtons={{ left: lookSource, right: lookSource }}
              touches={{ one: lookSource }}
              suppressContextMenu
            />
          </Aim.PanTilt>
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        {locked && <Crosshair />}
        <div className="pan-tilt-hud">
          {lockPointer ? 'left-click: lock cursor\nright-drag or touch: look around' : 'drag or touch: look around'}
          <div ref={panValueRef} />
        </div>
      </CanvasOverlay>
    </>
  );
}
