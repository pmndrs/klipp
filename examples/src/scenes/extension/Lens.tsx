import { Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { folder, useControls } from 'leva';
import { Euler, Quaternion } from 'three';

import { OrthographicSwitch } from '../../scene/OrthographicSwitch';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const cameraPosition: [number, number, number] = [0, 1.5, 5];
const cameraQuaternion = new Quaternion().setFromEuler(new Euler(0, 0, 0));
const nearObjectPosition: [number, number, number] = [0, 1.5, 3.2];

const tunnelRingCount = 12;
const tunnelSpacing = 6;
const tunnelStartZ = -2;
const tunnelColors = ['#21a9e0', '#ff6b4a'];
const tunnelRings = Array.from({ length: tunnelRingCount }, (_, i) => ({
  color: tunnelColors[i % tunnelColors.length],
  position: [0, 1.5, tunnelStartZ - i * tunnelSpacing] as const,
}));

function Tunnel() {
  return (
    <>
      {tunnelRings.map(({ color, position }, i) => (
        <mesh key={i} position={position}>
          <torusGeometry args={[2.5, 0.15, 12, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  );
}

export function Lens() {
  const {
    orthographic,
    fov,
    orthographicSize,
    near,
    far,
    fovDamping,
    orthographicSizeDamping,
    nearDamping,
    farDamping,
  } = useControls('Lens', {
    orthographic: false,
    fov: { value: 50, min: 10, max: 160, step: 1 },
    orthographicSize: { value: 3.5, min: 0.5, max: 10, step: 0.1 },
    near: { value: 1, min: 0.05, max: 3, step: 0.05 },
    far: { value: 40, min: 5, max: 100, step: 1 },
    Damping: folder({
      fovDamping: { value: 0.5, min: 0, max: 2, step: 0.05 },
      orthographicSizeDamping: { value: 0.5, min: 0, max: 2, step: 0.05 },
      nearDamping: { value: 0.5, min: 0, max: 2, step: 0.05 },
      farDamping: { value: 0.5, min: 0, max: 2, step: 0.05 },
    }),
  });

  return (
    <>
      <OrthographicSwitch enabled={orthographic} />
      <mesh position={nearObjectPosition}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#ffd23f" emissive="#ffd23f" emissiveIntensity={0.4} />
      </mesh>
      <Tunnel />

      <Klipp>
        <VirtualCamera
          name="lens-demo"
          priority={10}
          initialState={{ position: cameraPosition, quaternion: cameraQuaternion }}>
          <Extension.Lens
            fov={fov}
            orthographicSize={orthographicSize}
            near={near}
            far={far}
            fovDamping={fovDamping}
            orthographicSizeDamping={orthographicSizeDamping}
            nearDamping={nearDamping}
            farDamping={farDamping}
          />
          <SpectatorFrustum maxDistance={far} />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
