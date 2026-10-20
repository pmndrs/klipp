import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Group } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { Crosshair } from '../../scene/Crosshair';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { OrbitInput, orbitHint } from '../body/OrbitInput';

export function CameraOffset() {
  const head = useRef<Group>(null);
  const { offset } = useControls('CameraOffset', {
    offset: { value: { x: 0.8, y: 0.2, z: 0 }, step: 0.05 },
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.35, 1, 8, 16]} />
        <meshStandardMaterial color="#ffb347" />
      </mesh>
      <group ref={head} position={[0, 1.5, 0]} />

      <Klipp>
        <VirtualCamera name="camera-offset-demo" priority={10}>
          <Body.OrbitFollow
            target={head}
            radius={3}
            horizontal={{ damping: 0.1 }}
            vertical={{ center: 10, damping: 0.1 }}
            radial={{ damping: 0.15 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={head} />
          <Extension.CameraOffset offset={[offset.x, offset.y, offset.z]} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <Crosshair />
        <div className="pan-tilt-hud">{orbitHint}</div>
      </CanvasOverlay>
    </>
  );
}
