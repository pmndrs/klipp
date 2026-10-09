import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';
import type { Group } from 'three';

import { memberOrbits, memberRadius, type GroupMember } from './groupMembers';

/** Balls circling the origin at different radii and speeds, with `anchorRef` kept at their average position. */
export function OrbitingGroup({ members, anchorRef }: { members: GroupMember[]; anchorRef: RefObject<Group | null> }) {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let resolved = 0;

    memberOrbits.forEach((orbit, i) => {
      const mesh = members[i].target.current;
      if (!mesh) return;
      const angle = t * orbit.speed + orbit.phase;
      mesh.position.set(Math.cos(angle) * orbit.radius, orbit.height, Math.sin(angle) * orbit.radius);
      sumX += mesh.position.x;
      sumY += mesh.position.y;
      sumZ += mesh.position.z;
      resolved++;
    });

    // plain mean, matching `positionMode: 'groupAverage'`, so Aim looks at the point GroupFraming frames
    const anchor = anchorRef.current;
    if (anchor && resolved > 0) anchor.position.set(sumX / resolved, sumY / resolved, sumZ / resolved);
  });

  return (
    <>
      {memberOrbits.map((orbit, i) => (
        <mesh key={orbit.color} ref={members[i].target}>
          <sphereGeometry args={[memberRadius, 16, 16]} />
          <meshStandardMaterial color={orbit.color} emissive={orbit.color} emissiveIntensity={0.4} />
        </mesh>
      ))}
      <group ref={anchorRef} />
    </>
  );
}
