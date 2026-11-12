import { BlendCurves } from '@pmndrs/klipp';
import { Aim, Extension, Klipp, KlippControls as Controls, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef, useState } from 'react';
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
  const [onScreen, setOnScreen] = useState<string[]>([]);

  const { shot, blend, blendTime, blendDamping, blendThreshold } = useControls('KlippControls: Blending', {
    shot: { value: 'orbit subject' as Shot, options: ['orbit subject', 'orbit ball', 'fixed'] as Shot[] },
    blend: { value: 'curve', options: ['curve', 'damping'] },
    blendTime: {
      value: 1.5,
      min: 0,
      max: 4,
      step: 0.1,
      render: (get) => get('KlippControls: Blending.blend') === 'curve',
    },
    blendDamping: {
      value: 0.6,
      min: 0.05,
      max: 2,
      step: 0.05,
      render: (get) => get('KlippControls: Blending.blend') === 'damping',
    },
    blendThreshold: { value: 1, min: 0, max: 1, step: 0.05 },
  });

  const orthographicSize = useOrthographicSize('KlippControls: Blending', framingSize(8));

  const watch = (name: string) => ({
    blendThreshold,
    onEnter: () => setOnScreen((names) => [...names, name]),
    onLeave: () => setOnScreen((names) => names.filter((other) => other !== name)),
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />
      <Orbiter ref={ballRef} />

      <Klipp
        defaultBlend={
          blend === 'curve' ? { curve: BlendCurves.easeInOut, time: blendTime } : { damping: blendDamping }
        }>
        <Controls
          name="orbit-subject"
          priority={10}
          active={shot === 'orbit subject'}
          blendThreshold={blendThreshold}
          target={subjectRef}
          distance={8}
          vertical={{ center: 20, damping: 0.1 }}
          horizontal={{ damping: 0.1 }}
          pan={{ damping: 0.1 }}
          orbit={{ damping: 0.1 }}
          zoom={{ damping: 0.1 }}>
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum />
          <Controls.WhileOnScreen {...watch('orbit subject')} />
        </Controls>

        <Controls
          name="orbit-ball"
          priority={10}
          active={shot === 'orbit ball'}
          blendThreshold={blendThreshold}
          target={ballRef}
          distance={5}
          vertical={{ center: 20, damping: 0.1 }}
          horizontal={{ damping: 0.1 }}
          pan={{ damping: 0.1 }}
          orbit={{ damping: 0.1 }}
          zoom={{ damping: 0.1 }}>
          <Extension.Lens orthographicSize={orthographicSize * 0.6} />
          <SpectatorFrustum color="#ff6b4a" />
          <Controls.WhileOnScreen {...watch('orbit ball')} />
        </Controls>

        <VirtualCamera name="fixed" priority={10} active={shot === 'fixed'} initialState={{ position: [12, 9, -10] }}>
          <Aim.HardLookAt target={subjectRef} />
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum color="#7ed957" />
          <VirtualCamera.WhileOnScreen {...watch('fixed')} />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">
          {'drag: orbit\nright-drag or two fingers: pan\nwheel or pinch: zoom\n\n'}
          {`on screen: ${onScreen.length > 0 ? onScreen.join(', ') : '-'}`}
        </div>
      </CanvasOverlay>
    </>
  );
}
