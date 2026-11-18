import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';
import { Vector3, type Group } from 'three';

const bodyHeight = 2;
const wanderRangeX = 3;
const wanderRangeZ = 2;
const wanderSpeedX = 0.25;
const wanderSpeedZ = 0.18;
const tumbleSpeedX = 0.4;
const tumbleSpeedZ = 0.25;

const arrowOrigin = new Vector3(0, 0, 0);

function OffsetMarker({ offset }: { offset: [number, number, number] }) {
  const offsetVector = new Vector3(...offset);
  const length = offsetVector.length();
  if (length < 1e-3) return null;

  return <arrowHelper args={[offsetVector.clone().normalize(), arrowOrigin, length, '#ffd23f']} />;
}

/** A box wandering and tumbling in front of the origin, with a yellow arrow along `offset` in its own space. */
export function TumblingBody({ ref, offset }: { ref: RefObject<Group | null>; offset: [number, number, number] }) {
  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;
    const t = clock.elapsedTime;
    group.position.set(
      Math.sin(t * wanderSpeedX) * wanderRangeX,
      bodyHeight,
      Math.sin(t * wanderSpeedZ + 0.9) * wanderRangeZ,
    );
    group.rotation.set(t * tumbleSpeedX, 0, t * tumbleSpeedZ);
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[1.2, 1.2, 1]} />
        <meshStandardMaterial color="#21a9e0" />
      </mesh>
      <OffsetMarker offset={offset} />
    </group>
  );
}
