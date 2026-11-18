import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

// A ring round the middle; the shapes stand outside it, each across from knot 0, 2 or 4, far enough out that no
// two of them are ever straight across from each other as seen from the ring.
const knots: [number, number, number][] = [
  [7, 2, 0],
  [3.5, 3, 6.06],
  [-3.5, 2, 6.06],
  [-7, 3, 0],
  [-3.5, 2, -6.06],
  [3.5, 3, -6.06],
];

export function SplineDollyLookAtTargets() {
  const redRef = useRef<Mesh>(null);
  const blueRef = useRef<Mesh>(null);
  const greenRef = useRef<Mesh>(null);

  const { lookAlongPath, easing, duration, debug } = useControls('SplineDolly: Look At Targets', {
    lookAlongPath: false,
    easing: { value: 0.6, min: 0, max: 1, step: 0.05 },
    duration: { value: 15, min: 4, max: 40, step: 1 },
    debug: true,
  });

  const targets = lookAlongPath
    ? []
    : [
        { position: 0, lookAt: redRef },
        { position: 2, lookAt: blueRef },
        { position: 4, lookAt: greenRef },
      ];

  return (
    <>
      <mesh ref={redRef} position={[18, 1.5, 0]} scale={1.6}>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#ff6b4a" />
      </mesh>
      <mesh ref={blueRef} position={[-9, 1.6, 15.59]} scale={1.6}>
        <boxGeometry args={[1.6, 2, 1.6]} />
        <meshStandardMaterial color="#21a9e0" />
      </mesh>
      <mesh ref={greenRef} position={[-9, 1.5, -15.59]} scale={1.6}>
        <torusGeometry args={[0.9, 0.3, 16, 48]} />
        <meshStandardMaterial color="#7ed957" />
      </mesh>
      <GroundClutter layout="standard" />

      <Klipp>
        <VirtualCamera name="spline-dolly-look-at-targets" priority={10}>
          <Body.SplineDolly
            spline={knots}
            closed
            positionUnits="knot"
            automaticDolly={{ method: 'duration', from: 0, to: knots.length, duration, loop: 'loop' }}
            debug={debug}
          />
          <Aim.SplineDollyLookAtTargets targets={targets} easing={easing} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
