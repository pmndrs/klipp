import { BlendCurves, BlendHints as Hints, cameraState, type CameraState } from '@pmndrs/klipp';
import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import type { PanTiltAimThree } from '@pmndrs/klipp/three';
import { Line } from '@react-three/drei';
import { useControls } from 'leva';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GroundClutter } from '../../scene/GroundClutter';
import { addOffset, lookAtQuaternion } from '../../scene/lookAtQuaternion';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

type Vec3 = [number, number, number];

const subject: Vec3 = [0, 1.5, 0];
const frontOffset: Vec3 = [0, 3, 9];
const sideOffset: Vec3 = [-9, 5, -3];
const cctvMount: Vec3 = [8, 5, -5];
const tripodMount: Vec3 = [-6, 2.5, 7];
const freePosition: Vec3 = [3, 8, -10];
const offCenterMount = addOffset(subject, [0, 0.5, -1.2]);
const insideView: Vec3 = [0, 2, 8];
const buildingSize: Vec3 = [5, 4, 5];

const shots = ['front', 'side', 'cctv', 'tripod', 'free', 'inside', 'offcenter'] as const;
type Shot = (typeof shots)[number];

function shotState(position: Vec3, target: Vec3 | null): CameraState {
  return { ...cameraState.create(), position, target: target ?? [0, 0, 0], hasTarget: target !== null };
}

// Position and target of each shot as its Body writes them: the line samples the real blend between two of them.
const states: Record<Shot, CameraState> = {
  front: shotState(addOffset(subject, frontOffset), subject),
  side: shotState(addOffset(subject, sideOffset), subject),
  cctv: shotState(cctvMount, cctvMount),
  tripod: shotState(tripodMount, tripodMount),
  free: shotState(freePosition, null),
  inside: shotState(subject, subject),
  offcenter: shotState(offCenterMount, offCenterMount),
};

const PATH_SAMPLES = 40;
const scratchPathState = cameraState.create();

function samplePath(from: CameraState, to: CameraState, hints: number): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i <= PATH_SAMPLES; i++) {
    cameraState.lerp(scratchPathState, from, to, i / PATH_SAMPLES, hints);
    points.push([...scratchPathState.position] as Vec3);
  }
  return points;
}

function BlendPath({ from, to, hints }: { from: Shot; to: Shot; hints: number }) {
  const straight = useMemo(() => samplePath(states[from], states[to], Hints.none), [from, to]);
  const hinted = useMemo(() => samplePath(states[from], states[to], hints), [from, to, hints]);
  return (
    <>
      <Line points={straight} color="#666666" lineWidth={1} dashed dashSize={0.3} gapSize={0.2} />
      <Line points={hinted} color="#4fc3c7" lineWidth={2.5} />
    </>
  );
}

function Mount({ position, color }: { position: Vec3; color: string }) {
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, position[1] / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, position[1], 8]} />
        <meshStandardMaterial color="#666670" />
      </mesh>
      <mesh position={[0, position[1], 0]}>
        <boxGeometry args={[0.4, 0.3, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function BlendHintsTargets() {
  const [{ from, to }, setPair] = useState<{ from: Shot; to: Shot }>({ from: 'front', to: 'front' });
  const { hint, time } = useControls('BlendHints: Targets', {
    shot: {
      value: 'front',
      options: shots,
      onChange: (next: Shot) => setPair((pair) => (pair.to === next ? pair : { from: pair.to, to: next })),
    },
    hint: { value: 'spherical', options: ['none', 'spherical', 'cylindrical'] },
    time: { value: 2.5, min: 0.5, max: 6, step: 0.5 },
  });
  const hints =
    hint === 'spherical' ? Hints.sphericalPosition : hint === 'cylindrical' ? Hints.cylindricalPosition : Hints.none;

  const cctvAim = useRef<PanTiltAimThree>(null);
  const insideAim = useRef<PanTiltAimThree>(null);
  const offCenterAim = useRef<PanTiltAimThree>(null);
  useEffect(() => {
    cctvAim.current?.lookAt(subject);
    insideAim.current?.lookAt(insideView);
    offCenterAim.current?.lookAt(insideView);
  }, []);

  return (
    <>
      <SpinningSubject position={subject} />
      <GroundClutter layout="standard" />
      <Mount position={cctvMount} color="#ff6b4a" />
      <Mount position={tripodMount} color="#c77dff" />
      <mesh position={[subject[0], buildingSize[1] / 2, subject[2]]}>
        <boxGeometry args={buildingSize} />
        <meshStandardMaterial color="#8fb3d9" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      {from !== to && <BlendPath from={from} to={to} hints={hints} />}

      <Klipp defaultBlend={{ curve: BlendCurves.easeInOut, time }}>
        <VirtualCamera
          name="front"
          priority={10}
          active={to === 'front'}
          hints={hints}
          initialState={{ position: states.front.position }}>
          <Body.Follow target={subject} offset={frontOffset} bindingMode="worldSpace" />
          <Aim.HardLookAt target={subject} />
          <SpectatorFrustum color="#21a9e0" />
        </VirtualCamera>

        <VirtualCamera
          name="side"
          priority={10}
          active={to === 'side'}
          hints={hints}
          initialState={{ position: states.side.position }}>
          <Body.Follow target={subject} offset={sideOffset} bindingMode="worldSpace" />
          <Aim.HardLookAt target={subject} />
          <SpectatorFrustum color="#7ed957" />
        </VirtualCamera>

        <VirtualCamera
          name="cctv"
          priority={10}
          active={to === 'cctv'}
          hints={hints}
          initialState={{ position: cctvMount }}>
          <Body.HardLockToTarget target={cctvMount} />
          <Aim.PanTilt ref={cctvAim} />
          <SpectatorFrustum color="#ff6b4a" />
        </VirtualCamera>

        <VirtualCamera
          name="tripod"
          priority={10}
          active={to === 'tripod'}
          hints={hints}
          initialState={{ position: tripodMount }}>
          <Body.HardLockToTarget target={tripodMount} />
          <Aim.HardLookAt target={subject} />
          <SpectatorFrustum color="#c77dff" />
        </VirtualCamera>

        <VirtualCamera
          name="free"
          priority={10}
          active={to === 'free'}
          hints={hints}
          initialState={{ position: freePosition, quaternion: lookAtQuaternion(freePosition, subject) }}>
          <Aim.HardLookAt target={subject} />
          <SpectatorFrustum color="#ffd166" />
        </VirtualCamera>

        <VirtualCamera
          name="inside"
          priority={10}
          active={to === 'inside'}
          hints={hints}
          initialState={{ position: subject }}>
          <Body.HardLockToTarget target={subject} />
          <Aim.PanTilt ref={insideAim} />
          <SpectatorFrustum color="#ffffff" />
        </VirtualCamera>

        <VirtualCamera
          name="offcenter"
          priority={10}
          active={to === 'offcenter'}
          hints={hints}
          initialState={{ position: offCenterMount }}>
          <Body.HardLockToTarget target={offCenterMount} />
          <Aim.PanTilt ref={offCenterAim} />
          <SpectatorFrustum color="#ff9f1c" />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
