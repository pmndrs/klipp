import type { InputControllerDom } from '@kvvasuu/klipp/dom';
import { Aim, Body, InputController, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import type { OrbitFollowBodyThree } from '@kvvasuu/klipp/three';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useEffect, useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const orbitSource = { axes: { x: 'horizontal', y: 'vertical' }, gain: 0.3 };
const deltaModes = ['pixels', 'lines', 'pages'];

export function InputWheelAndPinch() {
  const subjectRef = useRef<Mesh>(null);
  const bodyRef = useRef<OrbitFollowBodyThree>(null);
  const controllerRef = useRef<InputControllerDom>(null);
  const valuesRef = useRef<HTMLDivElement>(null);
  const lastWheel = useRef('-');
  const domElement = useThree((state) => state.gl.domElement);

  const settings = useControls('Wheel and Pinch', {
    wheelGain: { value: 0.001, min: 0.0001, max: 0.005, step: 0.0001 },
    wheelInvert: true,
    pixelsPerLine: { value: 33, min: 1, max: 120, step: 1 },
    pinchGain: { value: 1, min: 0.1, max: 3, step: 0.1 },
    pinchInvert: true,
    zoomDamping: { value: 0.15, min: 0, max: 1, step: 0.05 },
    closest: { value: 0.5, min: 0.1, max: 1, step: 0.05, label: 'closest zoom' },
    farthest: { value: 2, min: 1, max: 5, step: 0.1, label: 'farthest zoom' },
  });

  useEffect(() => {
    const wheel = controllerRef.current?.inputSystem.wheel;
    if (wheel) wheel.pixelsPerLine = settings.pixelsPerLine;
  });

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const pinch = event.ctrlKey ? ', ctrl: a trackpad pinch' : '';
      lastWheel.current = `${event.deltaY.toFixed(1)} ${deltaModes[event.deltaMode]}${pinch}`;
    };
    domElement.addEventListener('wheel', onWheel);
    return () => domElement.removeEventListener('wheel', onWheel);
  }, [domElement]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!valuesRef.current || !body) return;
    valuesRef.current.textContent = `zoom ${Math.exp(body.radial.value).toFixed(2)}  ·  last wheel ${lastWheel.current}`;
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />

      <Klipp>
        <VirtualCamera name="input-wheel-and-pinch" priority={10}>
          <Body.OrbitFollow
            ref={bodyRef}
            target={subjectRef}
            radius={6}
            vertical={{ center: 20, damping: 0.1 }}
            horizontal={{ damping: 0.1 }}
            radial={{
              range: [Math.log(settings.closest), Math.log(settings.farthest)],
              damping: settings.zoomDamping,
            }}>
            <InputController
              ref={controllerRef}
              mouseButtons={{ left: orbitSource }}
              touches={{ one: orbitSource }}
              wheel={{ axis: 'radial', gain: settings.wheelGain, invert: settings.wheelInvert }}
              pinch={{ axis: 'radial', gain: settings.pinchGain, invert: settings.pinchInvert }}
            />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={subjectRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">
          {'scroll, pinch on a trackpad or with two fingers: zoom'}
          <div ref={valuesRef} />
        </div>
      </CanvasOverlay>
    </>
  );
}
