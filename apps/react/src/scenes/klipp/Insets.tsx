import { Klipp, KlippControls } from '@pmndrs/klipp/react';
import { useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const sideWidth = 360;

export function Insets() {
  const subjectRef = useRef<Mesh>(null);
  const height = useThree((state) => state.size.height);
  const { panel, insets, insetsDamping } = useControls('Insets', {
    panel: { value: 'side', options: ['side', 'drawer', 'none'] },
    insets: true,
    insetsDamping: { value: 0.3, min: 0, max: 1, step: 0.05 },
  });

  const drawerHeight = Math.round(height / 2);
  const covered = panel === 'side' ? { right: sideWidth } : panel === 'drawer' ? { bottom: drawerHeight } : {};

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />

      <Klipp insets={insets ? covered : undefined} insetsDamping={insetsDamping}>
        <KlippControls name="insets-demo" priority={10} target={subjectRef} distance={8} vertical={{ center: 20 }}>
          <SpectatorFrustum />
        </KlippControls>
      </Klipp>

      <CanvasOverlay>
        {panel !== 'none' && (
          <div
            className={`insets-panel insets-panel-${panel}`}
            style={panel === 'side' ? { width: sideWidth } : { height: drawerHeight }}>
            {insets ? `insets: ${JSON.stringify(covered)}` : 'insets off'}
          </div>
        )}
      </CanvasOverlay>
    </>
  );
}
