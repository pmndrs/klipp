import type { InputControllerDom, InteractiveArea } from '@kvvasuu/klipp/dom';
import { Aim, Body, InputController, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const orbitSource = { axes: { x: 'horizontal', y: 'vertical' }, gain: 0.3 };

const areas: Record<string, InteractiveArea | null> = {
  'whole canvas': null,
  'right half': { x: 0.5, y: 0, width: 0.5, height: 1 },
  'bottom half': { x: 0, y: 0.5, width: 1, height: 0.5 },
};

export function InputTouchAndAreas() {
  const subjectRef = useRef<Mesh>(null);
  const controllerRef = useRef<InputControllerDom>(null);

  const { area, lockTouchAxis, suppressContextMenu } = useControls('Touch and Areas', {
    area: { value: 'right half', options: Object.keys(areas) },
    lockTouchAxis: true,
    suppressContextMenu: true,
  });
  const interactiveArea = areas[area];

  useFrame(() => {
    const input = controllerRef.current?.input;
    if (input && subjectRef.current) subjectRef.current.rotation.y -= input.touchRotateDelta;
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <mesh ref={subjectRef} position={[0, 1.5, 0]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#ffd23f" />
      </mesh>

      <Klipp>
        <VirtualCamera name="input-touch-and-areas" priority={10}>
          <Body.OrbitFollow
            target={subjectRef}
            radius={6}
            horizontal={{ damping: 0.1 }}
            vertical={{ center: 20, damping: 0.1 }}
            radial={{ damping: 0.15 }}>
            <InputController
              ref={controllerRef}
              mouseButtons={{ left: orbitSource, right: orbitSource }}
              touches={{ one: orbitSource }}
              pinch={{ axis: 'radial', invert: true }}
              interactiveArea={interactiveArea}
              lockTouchAxis={lockTouchAxis}
              suppressContextMenu={suppressContextMenu}
            />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={subjectRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        {interactiveArea && (
          <div
            className="input-area"
            style={{
              left: `${interactiveArea.x * 100}%`,
              top: `${interactiveArea.y * 100}%`,
              width: `${interactiveArea.width * 100}%`,
              height: `${interactiveArea.height * 100}%`,
            }}
          />
        )}
        <div className="pan-tilt-hud">
          {'one finger or a mouse button: orbit\ntwo fingers: pinch to zoom, twist to turn the box'}
        </div>
      </CanvasOverlay>
    </>
  );
}
