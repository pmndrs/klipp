import type { ConsumedInput } from '@kvvasuu/klipp';
import type { InputControllerDom } from '@kvvasuu/klipp/dom';
import { Aim, Body, InputController, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const orbitSource = { axes: { x: 'horizontal', y: 'vertical' }, gain: 0.3 };
const spinPerPixel = 0.01;

const pairs: [string, keyof ConsumedInput, keyof ConsumedInput][] = [
  ['left', 'leftDx', 'leftDy'],
  ['middle', 'middleDx', 'middleDy'],
  ['right', 'rightDx', 'rightDy'],
  ['one finger', 'touchOneDx', 'touchOneDy'],
  ['two fingers', 'touchTwoDx', 'touchTwoDy'],
  ['three fingers', 'touchThreeDx', 'touchThreeDy'],
  ['wheel', 'wheelDeltaX', 'wheelDeltaY'],
  ['locked', 'lockedDx', 'lockedDy'],
];
const held: [string, keyof ConsumedInput][] = [
  ['left', 'leftHeld'],
  ['middle', 'middleHeld'],
  ['right', 'rightHeld'],
  ['1 finger', 'touchOneHeld'],
  ['2', 'touchTwoHeld'],
  ['3', 'touchThreeHeld'],
];

const format = (value: number) => (value === 0 ? '·' : value.toFixed(2));

export function InputRawInput() {
  const subjectRef = useRef<Mesh>(null);
  const controllerRef = useRef<InputControllerDom>(null);
  const hudRef = useRef<HTMLPreElement>(null);

  useFrame(() => {
    const input = controllerRef.current?.input;
    if (!input) return;

    // Right-drag is not mapped to any axis, so the scene spins the shape with it by hand.
    if (subjectRef.current) subjectRef.current.rotation.z += input.rightDx * spinPerPixel;

    if (!hudRef.current) return;
    const lines = pairs.map(
      ([name, x, y]) =>
        `${name.padEnd(14)}${format(input[x] as number).padStart(9)}${format(input[y] as number).padStart(9)}`,
    );
    lines.push(`pinch ${format(input.pinchDelta)}  twist ${format(input.touchRotateDelta)}`);
    lines.push(
      `held: ${
        held
          .filter(([, key]) => input[key])
          .map(([name]) => name)
          .join(', ') || '-'
      }`,
    );
    hudRef.current.textContent = lines.join('\n');
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />

      <Klipp>
        <VirtualCamera name="input-raw-input" priority={10}>
          <Body.OrbitFollow target={subjectRef} radius={6} vertical={{ center: 20 }}>
            <InputController
              ref={controllerRef}
              mouseButtons={{ left: orbitSource }}
              touches={{ one: orbitSource }}
              wheel={{ axis: 'radial', gain: 0.001, invert: true }}
              pinch={{ axis: 'radial', invert: true }}
              suppressContextMenu
            />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={subjectRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <pre className="pan-tilt-hud" ref={hudRef} style={{ width: '22rem' }} />
      </CanvasOverlay>
    </>
  );
}
