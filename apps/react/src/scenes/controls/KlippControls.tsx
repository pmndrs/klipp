import { Extension, Klipp, KlippControls as Controls } from '@pmndrs/klipp/react';
import type { KlippControlsThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { button, useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { Orbiter } from '../../scene/Orbiter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const bounds: [number, number, number, number, number, number] = [-4, 0.5, -4, 4, 4, 4];
const move = { damping: 0.4 };

export function KlippControls() {
  const subjectRef = useRef<Mesh>(null);
  const ballRef = useRef<Mesh>(null);
  const controlsRef = useRef<KlippControlsThree>(null);
  const valuesRef = useRef<HTMLDivElement>(null);

  const settings = useControls('KlippControls', {
    target: { value: 'subject', options: ['subject', 'ball', 'none'] },
    distance: { value: 8, min: 1, max: 20, step: 0.5 },
    minDistance: { value: 2, min: 0, max: 10, step: 0.5 },
    maxDistance: { value: 20, min: 5, max: 50, step: 1 },
    axisDamping: { value: 0.1, min: 0, max: 1, step: 0.05 },
    zoomDamping: { value: 0.1, min: 0, max: 1, step: 0.05 },
    panDamping: { value: 0.1, min: 0, max: 1, step: 0.05 },
    followDamping: { value: 0, min: 0, max: 1, step: 0.05 },
    panBounds: false,
    panSlowingDistance: { value: 0.5, min: 0, max: 3, step: 0.1, render: (get) => get('KlippControls.panBounds') },
    debug: true,
  });
  const { target, distance, minDistance, maxDistance, axisDamping, zoomDamping, panDamping, followDamping } = settings;
  const { panBounds, panSlowingDistance, debug } = settings;

  useControls('KlippControls', () => ({
    reset: button(() => controlsRef.current?.reset(move)),
    'fit the shape': button(() => {
      const subject = subjectRef.current;
      if (subject) controlsRef.current?.fit(subject, { ...move });
    }),
    'look from above': button(() => controlsRef.current?.setLookAt([6, 10, 6], undefined, move)),
  }));

  useFrame(() => {
    const controls = controlsRef.current;
    if (!valuesRef.current || !controls) return;
    const { horizontal, vertical, zoom, pan } = controls;
    valuesRef.current.textContent =
      `horizontal: ${horizontal.value.toFixed(1)}°  vertical: ${vertical.value.toFixed(1)}°  ` +
      `distance: ${(controls.distance * Math.exp(-zoom.value)).toFixed(2)}  ` +
      `pan: ${pan.map((value) => value.toFixed(1)).join(', ')}`;
  });

  const orthographicSize = useOrthographicSize('KlippControls', framingSize(8));

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />
      <Orbiter ref={ballRef} />
      {panBounds && (
        <mesh position={[0, (bounds[1] + bounds[4]) / 2, 0]}>
          <boxGeometry args={[bounds[3] - bounds[0], bounds[4] - bounds[1], bounds[5] - bounds[2]]} />
          <meshBasicMaterial color="#7ed957" wireframe />
        </mesh>
      )}

      <Klipp>
        <Controls
          ref={controlsRef}
          name="klipp-controls-demo"
          priority={10}
          target={target === 'subject' ? subjectRef : target === 'ball' ? ballRef : undefined}
          distance={distance}
          minDistance={minDistance}
          maxDistance={maxDistance}
          horizontal={{ damping: axisDamping }}
          vertical={{ center: 20, damping: axisDamping }}
          zoom={{ damping: zoomDamping }}
          pan={{ damping: panDamping }}
          orbit={{ damping: followDamping }}
          panBounds={panBounds ? bounds : null}
          panSlowingDistance={panSlowingDistance}
          debug={debug}>
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum />
        </Controls>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">
          {'drag: orbit\nright-drag or two fingers: pan\nwheel or pinch: zoom'}
          <div ref={valuesRef} />
        </div>
      </CanvasOverlay>
    </>
  );
}
