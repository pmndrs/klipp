import { BlendCurves, type SequencerCamera as SequencerCameraCore, type SequencerInstruction } from '@pmndrs/klipp';
import { Aim, Body, Klipp, SequencerCamera, VirtualCamera } from '@pmndrs/klipp/react';
import { useFrame } from '@react-three/fiber';
import { button, useControls } from 'leva';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Group } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { lookAtQuaternion } from '../../scene/lookAtQuaternion';
import { framingSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { OrbitInput, orbitHint } from '../body/OrbitInput';

const cut = { curve: BlendCurves.cut, time: 0 };

const pathRadius = 7;
const gatePosition: [number, number, number] = [pathRadius, 0, 0];
const zoneAngle = -0.32;
const zonePosition: [number, number, number] = [
  Math.cos(zoneAngle) * pathRadius,
  0.02,
  Math.sin(zoneAngle) * pathRadius,
];

type Point = [number, number, number];

const startAngle = -1.6;
const startPosition: Point = [Math.cos(startAngle) * pathRadius, 0, Math.sin(startAngle) * pathRadius];
// klipp takes a target's -Z as its forward, like a camera's, so the character faces -Z along the path.
const yawAt = (angle: number) => Math.PI - angle;

const orbitRadius = 6;
const orbitElevation = (20 * Math.PI) / 180;
const headHeight = 1.3;

/** Where the orbit puts the camera at the start: behind the character, `orbitElevation` up. */
function gameplayInitialState() {
  const yaw = yawAt(startAngle);
  const back = orbitRadius * Math.cos(orbitElevation);
  const position: Point = [
    startPosition[0] + Math.sin(yaw) * back,
    orbitRadius * Math.sin(orbitElevation),
    startPosition[2] + Math.cos(yaw) * back,
  ];
  return {
    position,
    quaternion: lookAtQuaternion(position, [startPosition[0], headHeight, startPosition[2]]),
    orthographicSize: framingSize(orbitRadius),
  };
}

// The first two shots stay put; the one from inside, at floor height, follows the character's head.
const shots = {
  outside: { position: [pathRadius + 4.5, 1.7, -4.5], lookAt: [pathRadius, 1.3, 0], distance: 6.4 },
  top: { position: [pathRadius, 10, -0.8], lookAt: [pathRadius, 0, 0], distance: 10 },
  inside: { position: [pathRadius + 3, 0.25, 4.5], lookAt: null, distance: 5 },
} satisfies Record<string, { position: Point; lookAt: Point | null; distance: number }>;
type Shot = keyof typeof shots;

const instructions: SequencerInstruction[] = [
  { camera: 'outside', hold: 1.8 },
  { camera: 'top', hold: 1.6, blend: cut },
  { camera: 'inside', hold: 3, blend: cut },
];

const colors: Record<Shot, string> = { outside: '#21a9e0', top: '#c77dff', inside: '#ff6b4a' };

function Character({ body, head }: { body: RefObject<Group | null>; head: RefObject<Group | null> }) {
  return (
    <group ref={body} position={startPosition} rotation={[0, yawAt(startAngle), 0]}>
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.35, 1, 8, 16]} />
        <meshStandardMaterial color="#ffb347" />
      </mesh>
      <mesh position={[0, 1.35, -0.35]}>
        <boxGeometry args={[0.25, 0.12, 0.2]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <group ref={head} position={[0, headHeight, 0]} />
    </group>
  );
}

function Gate({ door }: { door: RefObject<Group | null> }) {
  return (
    <group position={gatePosition}>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.4, 3, 0.4]} />
          <meshStandardMaterial color="#6b6f7a" />
        </mesh>
      ))}
      {[-3.8, 3.8].map((x) => (
        <mesh key={x} position={[x, 1, 0]}>
          <boxGeometry args={[4, 2, 0.3]} />
          <meshStandardMaterial color="#4a4e57" />
        </mesh>
      ))}
      <group ref={door} position={[-1.4, 0, 0]}>
        <mesh position={[1.4, 1.25, 0]}>
          <boxGeometry args={[2.8, 2.5, 0.15]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
      </group>
    </group>
  );
}

function TriggerZone({ armed }: { armed: boolean }) {
  return (
    <mesh position={zonePosition} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.1, 40]} />
      <meshBasicMaterial color={armed ? '#7ed957' : '#555555'} transparent opacity={0.8} />
    </mesh>
  );
}

function Status({ playing, shot, armed }: { playing: boolean; shot: string | null; armed: boolean }) {
  const index = instructions.findIndex((instruction) => instruction.camera === shot);
  return (
    <CanvasOverlay>
      <div className="pan-tilt-hud">
        {playing && index >= 0 ? `cutscene: ${shot} (${index + 1}/${instructions.length})` : orbitHint}
        <div>{armed ? 'green ring: plays the cutscene' : 'walk away from the ring to re-arm it'}</div>
      </div>
    </CanvasOverlay>
  );
}

export function SequencerCameraCutscene() {
  const character = useRef<Group>(null);
  const head = useRef<Group>(null);
  const door = useRef<Group>(null);
  const sequence = useRef<SequencerCameraCore>(null);
  const angle = useRef(startAngle);
  const armed = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [zoneArmed, setZoneArmed] = useState(true);
  const [shot, setShot] = useState<string | null>(null);
  const [resets, setResets] = useState(0);

  const { speed, fastForward, triggerZone } = useControls('SequencerCamera: Cutscene', {
    speed: { value: 1.2, min: 0.4, max: 3, step: 0.1 },
    fastForward: true,
    triggerZone: true,
    'play cutscene': button(() => setPlaying(true)),
    reset: button(() => {
      setResets((count) => count + 1);
      setZoneArmed(true);
      setPlaying(false);
    }),
  });

  useEffect(() => {
    if (resets === 0) return;
    angle.current = startAngle;
    armed.current = true;
  }, [resets]);

  useEffect(() => {
    const cutscene = sequence.current;
    if (!cutscene) return;
    const onActivated = (event: { incoming: string }) => setShot(event.incoming);
    cutscene.children.addEventListener('activated', onActivated);
    return () => cutscene.children.removeEventListener('activated', onActivated);
  }, []);

  useFrame((_, delta) => {
    const body = character.current;
    if (!body) return;
    const toGate = Math.hypot(body.position.x - gatePosition[0], body.position.z - gatePosition[2]);
    const pace = fastForward && !playing && toGate > 5 ? 4 : 1;
    angle.current += ((speed * pace) / pathRadius) * delta;
    body.position.set(Math.cos(angle.current) * pathRadius, 0, Math.sin(angle.current) * pathRadius);
    body.rotation.y = yawAt(angle.current);

    const toZone = Math.hypot(body.position.x - zonePosition[0], body.position.z - zonePosition[2]);
    if (armed.current && triggerZone && toZone < 0.8) {
      armed.current = false;
      setZoneArmed(false);
      setPlaying(true);
    } else if (!armed.current && toZone > 6) {
      armed.current = true;
      setZoneArmed(true);
    }

    if (door.current) {
      const open = toGate < 3.5 ? -Math.PI * 0.45 : 0;
      door.current.rotation.y += (open - door.current.rotation.y) * Math.min(1, delta * 4);
    }

    if (playing && sequence.current?.isFinished) setPlaying(false);
  });

  return (
    <>
      <Character body={character} head={head} />
      <Gate door={door} />
      <TriggerZone armed={zoneArmed} />

      <Klipp defaultBlend={cut}>
        <Status playing={playing} shot={shot} armed={zoneArmed} />

        <VirtualCamera name="gameplay" priority={10} initialState={gameplayInitialState()}>
          <Body.OrbitFollow
            target={character}
            radius={orbitRadius}
            bindingMode="lockToTargetWithWorldUp"
            rotationDamping={0.4}
            vertical={{ center: 20, damping: 0.1 }}
            horizontal={{ damping: 0.1 }}
            radial={{ damping: 0.15 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={head} />
          <SpectatorFrustum />
        </VirtualCamera>

        <SequencerCamera ref={sequence} name="cutscene" priority={20} active={playing} instructions={instructions}>
          {(Object.keys(shots) as Shot[]).map((name) => (
            <VirtualCamera
              key={name}
              name={name}
              initialState={{ orthographicSize: framingSize(shots[name].distance) }}>
              <Body.HardLockToTarget target={shots[name].position} />
              <Aim.HardLookAt target={shots[name].lookAt ?? head} />
              <SpectatorFrustum color={colors[name]} />
            </VirtualCamera>
          ))}
        </SequencerCamera>
      </Klipp>
    </>
  );
}
