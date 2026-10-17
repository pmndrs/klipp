import type { MixingCamera as MixingCameraCore } from '@pmndrs/klipp';
import { Aim, Body, Extension, Klipp, MixingCamera, Noise, VirtualCamera } from '@pmndrs/klipp/react';
import type { BasicMultiChannelPerlinNoiseThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { BufferGeometry, CatmullRomCurve3, DoubleSide, Float32BufferAttribute, Vector3, type Group } from 'three';

import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

import { MixShares } from './MixShares';

const roadHalfWidth = 2.5;
const minSpeed = 4;
const maxSpeed = 30;
/** Above this speed the fast camera starts to shake, at full strength by `maxSpeed`. */
const shakeFromSpeed = 25;

// The radius swells and dips with the angle: long sweepers outward, tighter turns the other way, never crossing.
const radiusAt = (angle: number) =>
  52 + 13 * Math.sin(3 * angle) + 4 * Math.cos(angle + 0.8) + 2.5 * Math.sin(4 * angle + 0.3);

const track = new CatmullRomCurve3(
  Array.from({ length: 180 }, (_, i) => {
    const angle = (i / 180) * Math.PI * 2;
    const radius = radiusAt(angle);
    return new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }),
  true,
);
track.arcLengthDivisions = 2000;
const lapLength = track.getLength();

const point = new Vector3();
const direction = new Vector3();

/** Fills `point` and `direction` with the track `distance` meters into the lap. */
function trackAt(distance: number): void {
  const u = (((distance % lapLength) + lapLength) % lapLength) / lapLength;
  track.getPointAt(u, point);
  track.getTangentAt(u, direction);
}

// klipp takes a target's -Z as its forward, so the car drives along its -Z.
const yaw = () => Math.atan2(-direction.x, -direction.z);

const colors = { calm: '#21a9e0', fast: '#ff6b4a' };

function edgeAt(distance: number, side: number): [number, number, number] {
  trackAt(distance);
  return [point.x - direction.z * side, 0, point.z + direction.x * side];
}

const pylonCount = Math.round(lapLength / 3);
const pylons = Array.from({ length: pylonCount }, (_, i) => (i / pylonCount) * lapLength).flatMap((distance) => [
  edgeAt(distance, roadHalfWidth + 0.4),
  edgeAt(distance, -roadHalfWidth - 0.4),
]);

function Road() {
  const geometry = useMemo(() => {
    const segments = 600;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const distance = (i / segments) * lapLength;
      const left = edgeAt(distance, roadHalfWidth);
      const right = edgeAt(distance, -roadHalfWidth);
      positions.push(left[0], 0.01, left[2], right[0], 0.01, right[2]);
      if (i < segments) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const road = new BufferGeometry();
    road.setAttribute('position', new Float32BufferAttribute(positions, 3));
    road.setIndex(indices);
    road.computeVertexNormals();
    return road;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#3a3d44" side={DoubleSide} />
    </mesh>
  );
}

function Car({ body, ahead }: { body: RefObject<Group | null>; ahead: RefObject<Group | null> }) {
  trackAt(0);
  return (
    <group ref={body} position={[point.x, 0, point.z]} rotation={[0, yaw(), 0]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.8, 0.6, 3.8]} />
        <meshStandardMaterial color="#ff6b4a" />
      </mesh>
      <mesh position={[0, 1, 0.3]}>
        <boxGeometry args={[1.5, 0.5, 1.8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <group ref={ahead} position={[0, 1, -6]} />
    </group>
  );
}

function Pylons() {
  return pylons.map((position, i) => (
    <mesh key={i} position={position}>
      <boxGeometry args={[0.3, 0.1, 0.3]} />
      <meshStandardMaterial color={i % 4 < 2 ? '#e0e0e0' : '#ff4d47'} />
    </mesh>
  ));
}

export function MixingCameraSpeed() {
  const car = useRef<Group>(null);
  const ahead = useRef<Group>(null);
  const mix = useRef<MixingCameraCore>(null);
  const shake = useRef<BasicMultiChannelPerlinNoiseThree>(null);
  const distance = useRef(0);
  const speed = useRef(minSpeed);
  const [weights] = useState(() => ({ calm: 1, fast: 0 }));
  const controls = useControls('MixingCamera: Speed', {
    autoSpeed: true,
    speed: { value: 10, min: minSpeed, max: maxSpeed, step: 0.5 },
  });

  // Priority -1 moves the car before <Klipp> updates, so the cameras see where it is this frame.
  useFrame(({ clock }, delta) => {
    const body = car.current;
    const current = mix.current?.weights;
    if (!body || !current) return;
    speed.current = controls.autoSpeed
      ? minSpeed + (maxSpeed - minSpeed) * (0.5 - 0.5 * Math.cos(clock.elapsedTime * 0.35))
      : controls.speed;
    distance.current += speed.current * delta;
    trackAt(distance.current);
    body.position.set(point.x, 0, point.z);
    body.rotation.y = yaw();

    current.fast = (speed.current - minSpeed) / (maxSpeed - minSpeed);
    current.calm = 1 - current.fast;
    if (shake.current) {
      shake.current.amplitudeGain = Math.max(0, (speed.current - shakeFromSpeed) / (maxSpeed - shakeFromSpeed));
    }
  }, -1);

  return (
    <>
      <Road />
      <Pylons />
      <Car body={car} ahead={ahead} />

      <Klipp>
        <MixShares mix={mix} colors={colors} status={() => `speed: ${speed.current.toFixed(1)} m/s`} />

        <MixingCamera ref={mix} name="chase" weights={weights}>
          <VirtualCamera name="calm">
            <Body.Follow
              target={car}
              offset={[0, 3.5, 10]}
              bindingMode="lockToTargetWithWorldUp"
              damping={0.3}
              rotationDamping={0.4}
            />
            <Aim.HardLookAt target={car} />
            <Extension.Lens fov={50} />
            <SpectatorFrustum color={colors.calm} />
          </VirtualCamera>
          <VirtualCamera name="fast">
            <Body.Follow
              target={car}
              offset={[0, 1.3, 3]}
              bindingMode="lockToTargetWithWorldUp"
              damping={0.15}
              rotationDamping={0.25}
            />
            <Aim.HardLookAt target={ahead} />
            <Extension.Lens fov={90} />
            <Noise.BasicMultiChannelPerlin
              ref={shake}
              positionAmplitude={0.15}
              positionFrequency={5}
              amplitudeGain={0}
              amplitudeDamping={0.5}
            />
            <SpectatorFrustum color={colors.fast} />
          </VirtualCamera>
        </MixingCamera>
      </Klipp>
    </>
  );
}
