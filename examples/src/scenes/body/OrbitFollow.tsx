import { BindingModes, type BindingMode } from '@kvvasuu/klipp';
import { Aim, Body, InputController, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import type { OrbitFollowBodyThree } from '@kvvasuu/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef, type RefObject } from 'react';
import type { Group, Mesh, Object3D } from 'three';

import { Airplane } from '../../scene/Airplane';
import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const degreesPerPixel = 0.3;
const orbitSource = { axes: { x: 'horizontal', y: 'vertical' }, gain: degreesPerPixel };

type OrbitSettings = {
  radius: number;
  damping: number;
  bindingMode: BindingMode;
  axisDamping: number;
  zoomDamping: number;
  wheelGain: number;
  waitForBlend: boolean;
};

function OrbitCamera({
  name,
  active,
  target,
  bodyRef,
  settings,
}: {
  name: string;
  active: boolean;
  target: RefObject<Object3D | null>;
  bodyRef: RefObject<OrbitFollowBodyThree | null>;
  settings: OrbitSettings;
}) {
  const { radius, damping, bindingMode, axisDamping, zoomDamping, wheelGain, waitForBlend } = settings;
  return (
    <VirtualCamera name={name} priority={10} active={active}>
      <Body.OrbitFollow
        ref={bodyRef}
        target={target}
        radius={radius}
        damping={damping}
        bindingMode={bindingMode}
        horizontal={{ damping: axisDamping }}
        vertical={{ damping: axisDamping }}
        radial={{ damping: zoomDamping }}>
        <InputController
          waitForBlend={waitForBlend}
          mouseButtons={{ left: orbitSource }}
          touches={{ one: orbitSource }}
          wheel={{ axis: 'radial', gain: wheelGain, invert: true }}
          pinch={{ axis: 'radial', invert: true }}
        />
      </Body.OrbitFollow>
      <Aim.HardLookAt target={target} />
      <SpectatorFrustum />
    </VirtualCamera>
  );
}

export function OrbitFollow() {
  const planeRef = useRef<Group>(null);
  const subjectRef = useRef<Mesh>(null);
  const planeBodyRef = useRef<OrbitFollowBodyThree>(null);
  const subjectBodyRef = useRef<OrbitFollowBodyThree>(null);
  const valuesRef = useRef<HTMLDivElement>(null);

  const { target, ...settings } = useControls('OrbitFollow', {
    target: { value: 'plane', options: ['plane', 'subject'] },
    radius: { value: 6, min: 1, max: 20, step: 0.5 },
    damping: { value: 0.3, min: 0, max: 2, step: 0.05 },
    bindingMode: { value: BindingModes.lockToTargetWithWorldUp as BindingMode, options: Object.values(BindingModes) },
    axisDamping: { value: 0.1, min: 0, max: 1, step: 0.05 },
    zoomDamping: { value: 0.15, min: 0, max: 1, step: 0.05 },
    wheelGain: { value: 0.001, min: 0.0001, max: 0.005, step: 0.0001 },
    waitForBlend: true,
  });

  useFrame(() => {
    const body = target === 'plane' ? planeBodyRef.current : subjectBodyRef.current;
    if (!valuesRef.current || !body) return;
    const { horizontal, vertical, radial } = body;
    valuesRef.current.textContent =
      `horizontal: ${horizontal.value.toFixed(1)}°  vertical: ${vertical.value.toFixed(1)}°  ` +
      `scale: ${Math.exp(radial.value).toFixed(2)}`;
  });

  return (
    <>
      <GroundClutter layout="flightPath" />
      <Airplane ref={planeRef} />
      <SpinningSubject ref={subjectRef} position={[0, 1, 6]} />

      <Klipp>
        <OrbitCamera
          name="orbit-plane"
          active={target === 'plane'}
          target={planeRef}
          bodyRef={planeBodyRef}
          settings={settings}
        />
        <OrbitCamera
          name="orbit-subject"
          active={target === 'subject'}
          target={subjectRef}
          bodyRef={subjectBodyRef}
          settings={settings}
        />
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">
          {'drag: orbit\nwheel or pinch: zoom'}
          <div ref={valuesRef} />
        </div>
      </CanvasOverlay>
    </>
  );
}
