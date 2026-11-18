import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef, type RefObject } from 'react';
import type { Mesh } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const roadZ = (x: number) => Math.sin(x * 0.25) * 1.2;

// Runs alongside the road, so the point nearest the box slides along it without jumping.
const rail: [number, number, number][] = [
  [-14, 2, 6.42],
  [-10.5, 2, 5.41],
  [-7, 2, 4.82],
  [-3.5, 2, 5.08],
  [0, 2, 6],
  [3.5, 2, 6.92],
  [7, 2, 7.18],
  [10.5, 2, 6.59],
  [14, 2, 5.58],
];

/** Drives back and forth along a winding road in front of the rail. */
function Runner({ meshRef, speed }: { meshRef: RefObject<Mesh | null>; speed: number }) {
  const time = useRef(0);
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    time.current += delta * speed;
    const x = Math.sin(time.current) * 12;
    mesh.position.set(x, 0.6, roadZ(x));
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.6, 0.8, 0.9]} />
      <meshStandardMaterial color="#ff6b4a" />
    </mesh>
  );
}

export function SplineDollyRail() {
  const runnerRef = useRef<Mesh>(null);

  const { speed, positionOffset, damping, debug } = useControls('SplineDolly: Rail', {
    speed: { value: 0.4, min: 0, max: 1.5, step: 0.05 },
    positionOffset: { value: 0, min: -6, max: 6, step: 0.25, label: 'positionOffset (m)' },
    damping: { value: 0.3, min: 0, max: 2, step: 0.05 },
    debug: true,
  });

  return (
    <>
      <Runner meshRef={runnerRef} speed={speed} />
      <GroundClutter layout="standard" />

      <Klipp>
        <VirtualCamera name="spline-dolly-rail" priority={10}>
          <Body.SplineDolly
            target={runnerRef}
            spline={rail}
            positionUnits="distance"
            damping={damping}
            automaticDolly={{ method: 'nearestPointToTarget', positionOffset }}
            debug={debug}
          />
          <Aim.HardLookAt target={runnerRef} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
