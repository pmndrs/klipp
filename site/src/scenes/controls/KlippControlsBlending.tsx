import { BlendCurves } from '@pmndrs/klipp';
import { Aim, Extension, Klipp, KlippControls as Controls, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { Orbiter } from '../../scene/Orbiter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

type Shot = 'orbit subject' | 'orbit ball' | 'fixed';

export function KlippControlsBlending() {
  const subjectRef = useRef<Mesh>(null);
  const ballRef = useRef<Mesh>(null);

  const { shot, blendTime, waitForBlend } = useControls('KlippControls: Blending', {
    shot: { value: 'orbit subject' as Shot, options: ['orbit subject', 'orbit ball', 'fixed'] as Shot[] },
    blendTime: { value: 1.5, min: 0, max: 4, step: 0.1 },
    waitForBlend: false,
  });

  const orthographicSize = useOrthographicSize('KlippControls: Blending', framingSize(8));

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />
      <Orbiter ref={ballRef} />

      <Klipp defaultBlend={{ curve: BlendCurves.easeInOut, time: blendTime }}>
        <Controls
          name="orbit-subject"
          priority={10}
          active={shot === 'orbit subject'}
          waitForBlend={waitForBlend}
          target={subjectRef}
          distance={8}
          vertical={{ center: 20, damping: 0.1 }}
          horizontal={{ damping: 0.1 }}
          pan={{ damping: 0.1 }}
          orbit={{ damping: 0.1 }}
          zoom={{ damping: 0.1 }}>
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum />
        </Controls>

        <Controls
          name="orbit-ball"
          priority={10}
          active={shot === 'orbit ball'}
          waitForBlend={waitForBlend}
          target={ballRef}
          distance={5}
          vertical={{ center: 20, damping: 0.1 }}
          horizontal={{ damping: 0.1 }}
          pan={{ damping: 0.1 }}
          orbit={{ damping: 0.1 }}
          zoom={{ damping: 0.1 }}>
          <Extension.Lens orthographicSize={orthographicSize * 0.6} />
          <SpectatorFrustum color="#ff6b4a" />
        </Controls>

        <VirtualCamera name="fixed" priority={10} active={shot === 'fixed'} initialState={{ position: [12, 9, -10] }}>
          <Aim.HardLookAt target={subjectRef} />
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum color="#7ed957" />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">{'drag: orbit\nright-drag or two fingers: pan\nwheel or pinch: zoom'}</div>
      </CanvasOverlay>
    </>
  );
}
