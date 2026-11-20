import { BlendCurves, BlendHints } from '@pmndrs/klipp';
import { Aim, Body, Extension, Klipp, KlippControls, VirtualCamera } from '@pmndrs/klipp/react';
import type { SplineDollyBodyThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

type Shot = 'flyby' | 'free look';

const flybyPath: [number, number, number][] = [
  [11, 2, 0],
  [6, 6, 9],
  [-7, 3, 8],
  [-10, 8, -3],
  [-2, 4, -11],
  [8, 7, -7],
];

const flybySpeed = 0.04;

export function BlendHintsInheritPosition() {
  const subjectRef = useRef<Mesh>(null);
  const dollyRef = useRef<SplineDollyBodyThree>(null);
  const flyby = useRef(0);

  const { shot, inheritPosition } = useControls('BlendHints: inheritPosition', {
    shot: { value: 'flyby' as Shot, options: ['flyby', 'free look'] as Shot[] },
    inheritPosition: true,
  });

  const orthographicSize = useOrthographicSize('BlendHints: inheritPosition', framingSize(10));

  // Keeps going while the free look is on, so the flyby goes on from where it is.
  useFrame((_, delta) => {
    flyby.current += delta * flybySpeed;
    if (dollyRef.current) dollyRef.current.position = flyby.current;
  }, -1);

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />

      <Klipp defaultBlend={{ curve: BlendCurves.easeInOut, time: 1.5 }}>
        <VirtualCamera name="flyby" priority={10} active={shot === 'flyby'}>
          <Body.SplineDolly ref={dollyRef} spline={flybyPath} closed debug />
          <Aim.HardLookAt target={subjectRef} />
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum color="#ff6b4a" />
        </VirtualCamera>

        <KlippControls
          name="free-look"
          priority={10}
          active={shot === 'free look'}
          hints={inheritPosition ? BlendHints.inheritPosition : BlendHints.none}
          target={subjectRef}
          distance={14}
          vertical={{ center: 30, damping: 0.1 }}
          horizontal={{ damping: 0.1 }}
          pan={{ damping: 0.1 }}
          zoom={{ damping: 0.1 }}
          blendThreshold={0}>
          <Extension.Lens orthographicSize={orthographicSize} />
          <SpectatorFrustum />
        </KlippControls>
      </Klipp>

      {shot === 'free look' && (
        <CanvasOverlay>
          <div className="pan-tilt-hud">{'drag: orbit\nright-drag or two fingers: pan\nwheel or pinch: zoom'}</div>
        </CanvasOverlay>
      )}
    </>
  );
}
