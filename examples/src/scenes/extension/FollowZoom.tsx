import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import type { Group } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const subjectPosition: [number, number, number] = [0, 1.5, 0];

export function FollowZoom() {
  const rig = useRef<Group>(null);
  const time = useRef(0);
  const { dolly, followZoom, width, damping } = useControls('FollowZoom', {
    dolly: true,
    followZoom: true,
    width: { value: 4, min: 0.5, max: 10, step: 0.1 },
    damping: { value: 0, min: 0, max: 2, step: 0.05 },
  });

  // Priority -1 moves the rig before <Klipp> updates, so the camera sees where it is this frame.
  useFrame((_, delta) => {
    if (!rig.current || !dolly) return;
    time.current += delta;
    rig.current.position.z = 10 + 6 * Math.sin(time.current * 0.6);
  }, -1);

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject position={subjectPosition} />
      <group ref={rig} position={[0, 1.8, 10]} />

      <Klipp>
        <VirtualCamera name="follow-zoom-demo" priority={10}>
          <Body.HardLockToTarget target={rig} />
          <Aim.HardLookAt target={subjectPosition} />
          {followZoom && <Extension.FollowZoom target={subjectPosition} width={width} damping={damping} />}
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
