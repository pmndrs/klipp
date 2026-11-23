import { Aim, Extension, InputController, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { Crosshair } from '../../scene/Crosshair';
import { GroundClutter } from '../../scene/GroundClutter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const degreesPerPixel = 0.15;
const lookSource = { axes: { x: 'pan', y: 'tilt' }, gain: degreesPerPixel, zoomAxis: 'zoom' };
const markerDistance = 10;
const markerHeight = 2;

/** A pillar marking one edge of the `pan` range, at the world direction the camera reaches right at its limit. */
function RangeMarker({ angleDeg }: { angleDeg: number }) {
  const rad = (angleDeg * Math.PI) / 180;
  const position: [number, number, number] = [
    Math.sin(rad) * markerDistance,
    markerHeight,
    -Math.cos(rad) * markerDistance,
  ];
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.3, 0.3, 3, 12]} />
      <meshStandardMaterial color="#ff6b4a" emissive="#ff6b4a" emissiveIntensity={0.3} />
    </mesh>
  );
}

export function PanTiltRestrictedLook() {
  const settings = useControls('PanTilt: Restricted Look', {
    panMin: { value: -30, min: -180, max: 0, step: 5 },
    panMax: { value: 30, min: 0, max: 180, step: 5 },
    tiltMin: { value: -20, min: -90, max: 0, step: 5 },
    tiltMax: { value: 30, min: 0, max: 90, step: 5 },
    autoMove: false,
    autoMoveSpeed: { value: 20, min: 5, max: 60, step: 1, render: (get) => get('PanTilt: Restricted Look.autoMove') },
    maxZoom: { value: 10, min: 2, max: 30, step: 1 },
    lockPointer: false,
  });
  const { panMin, panMax, tiltMin, tiltMax, autoMove, autoMoveSpeed, maxZoom, lockPointer } = settings;

  const orthographicSize = useOrthographicSize('PanTilt: Restricted Look', framingSize(10));

  return (
    <>
      <GroundClutter layout="lookAround" />
      <RangeMarker angleDeg={panMin} />
      <RangeMarker angleDeg={panMax} />

      <Klipp>
        <VirtualCamera name="pan-tilt-restricted-look-demo" priority={10} initialState={{ position: [0, 2, 0] }}>
          <Aim.PanTilt
            pan={{
              wrap: false,
              range: [panMin, panMax],
              damping: 0.05,
              autoMove: { enabled: autoMove, speed: autoMoveSpeed },
            }}
            tilt={{ range: [tiltMin, tiltMax], damping: 0.05 }}
          />
          <Extension.Lens orthographicSize={orthographicSize} zoom={{ range: [0, Math.log(maxZoom)], damping: 0.2 }} />
          <InputController
            pointerLock={lockPointer}
            mouseButtons={{ left: lookSource, right: lookSource }}
            touches={{ one: lookSource }}
            wheel={{ axis: 'zoom', gain: 0.001 }}
            pinch={{ axis: 'zoom' }}
            suppressContextMenu
          />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <Crosshair />
        <div className="pan-tilt-hud">
          {(lockPointer ? 'click: lock cursor, Esc: release\n' : '') +
            'drag past either pillar and keep dragging -\nthe camera stops dead, it never wraps or slides past\nscroll or pinch: zoom'}
        </div>
      </CanvasOverlay>
    </>
  );
}
