import { Aim, Body, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

import { OrbitInput, orbitHint } from './OrbitInput';

const height = (value: number) => ({ value, min: -5, max: 10, step: 0.25 });
const radius = (value: number) => ({ value, min: 0.5, max: 12, step: 0.25 });

export function OrbitFollowThreeRing() {
  const subjectRef = useRef<Mesh>(null);

  const settings = useControls('OrbitFollow: Three Rings', {
    topHeight: height(6),
    topRadius: radius(3),
    centerHeight: height(2),
    centerRadius: radius(7),
    bottomHeight: height(0),
    bottomRadius: radius(4),
    splineCurvature: { value: 0.5, min: 0, max: 1, step: 0.05 },
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />

      <Klipp>
        <VirtualCamera name="orbit-follow-three-ring-demo" priority={10}>
          <Body.OrbitFollow
            target={subjectRef}
            orbitStyle="threeRing"
            orbits={{
              top: { height: settings.topHeight, radius: settings.topRadius },
              center: { height: settings.centerHeight, radius: settings.centerRadius },
              bottom: { height: settings.bottomHeight, radius: settings.bottomRadius },
            }}
            splineCurvature={settings.splineCurvature}
            debug
            horizontal={{ damping: 0.1 }}
            vertical={{ damping: 0.1 }}
            radial={{ damping: 0.15 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={subjectRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">{orbitHint}</div>
      </CanvasOverlay>
    </>
  );
}
