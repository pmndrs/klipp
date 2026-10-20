import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { Orbiter } from '../../scene/Orbiter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { OrbitInput } from '../body/OrbitInput';

export function Confiner() {
  const ball = useRef<Mesh>(null);
  const { ballMoves, confiner, slowingDistance, halfWidth, height } = useControls('Confiner', {
    ballMoves: true,
    confiner: true,
    slowingDistance: { value: 1, min: 0, max: 4, step: 0.1 },
    halfWidth: { value: 9, min: 4, max: 16, step: 0.5 },
    height: { value: 6, min: 2, max: 12, step: 0.5 },
  });

  return (
    <>
      <GroundClutter layout="standard" />
      <Orbiter ref={ball} paused={!ballMoves} />
      <mesh position={[0, (0.5 + height) / 2, 0]}>
        <boxGeometry args={[halfWidth * 2, height - 0.5, halfWidth * 2]} />
        <meshBasicMaterial color="#7ed957" wireframe />
      </mesh>

      <Klipp>
        <VirtualCamera name="confiner-demo" priority={10}>
          <Body.OrbitFollow
            target={ball}
            radius={6}
            horizontal={{ damping: 0.1 }}
            vertical={{ center: 20, damping: 0.1 }}
            radial={{ damping: 0.1 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={ball} />
          {confiner && (
            <Extension.Confiner
              bounds={[-halfWidth, 0.5, -halfWidth, halfWidth, height, halfWidth]}
              slowingDistance={slowingDistance}
            />
          )}
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
