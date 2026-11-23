import { Aim, Body, Extension, InputController, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { type PanTiltAimThree } from '@pmndrs/klipp/three';
import { useControls } from 'leva';
import { useRef } from 'react';
import { Euler, Group, Quaternion } from 'three';

import { Airplane } from '../../scene/Airplane';
import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { Crosshair } from '../../scene/Crosshair';
import { GroundClutter } from '../../scene/GroundClutter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const initialQuaternion = new Quaternion().setFromEuler(new Euler((-10 * Math.PI) / 180, 0, 0));

const degreesPerPixel = 0.15;
const lookSource = { axes: { x: 'pan', y: 'tilt' }, gain: degreesPerPixel };
const seatOffset: [number, number, number] = [0, 0.8, 1];

export function PanTiltReferenceFrame() {
  const planeRef = useRef<Group>(null);
  const aimRef = useRef<PanTiltAimThree>(null);

  const { rigidMount, lockPointer } = useControls('PanTilt: Reference Frame', {
    rigidMount: true,
    lockPointer: false,
  });

  const orthographicSize = useOrthographicSize('PanTilt: Reference Frame', framingSize(10));

  return (
    <>
      <GroundClutter layout="flightPath" />
      <Airplane ref={planeRef} />

      <Klipp>
        <VirtualCamera
          name="pan-tilt-reference-frame-demo"
          priority={10}
          initialState={{ quaternion: initialQuaternion }}>
          <Body.Follow target={planeRef} offset={seatOffset} bindingMode="lockToTarget" />
          <Aim.PanTilt
            ref={aimRef}
            target={rigidMount ? planeRef : undefined}
            pan={{ damping: 0.05 }}
            tilt={{ damping: 0.05 }}>
            <InputController
              pointerLock={lockPointer}
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
        <Crosshair />
        <div className="pan-tilt-hud">
          {lockPointer
            ? 'click: lock cursor, Esc: release\nright-drag or touch: look around'
            : 'drag or touch: look around'}
        </div>
      </CanvasOverlay>
    </>
  );
}
