import type { StandbyUpdate as StandbyUpdateMode } from '@kvvasuu/klipp';
import { Aim, Body, Klipp, VirtualCamera, useVirtualCamera } from '@kvvasuu/klipp/react';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useEffect, useRef, type RefObject } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const modes: StandbyUpdateMode[] = ['always', 'roundRobin', 'never'];
const ringRadius = 9;
const ringHeight = 3.5;

/** The clock time each camera's pieces last ran at. */
type RunLog = number[];

function Runner({ meshRef }: { meshRef: RefObject<Mesh | null> }) {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 1.4;
    meshRef.current?.position.set(Math.cos(t) * 4, 1 + Math.abs(Math.sin(t * 2)) * 1.5, Math.sin(t) * 4);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 24, 24]} />
      <meshStandardMaterial color="#ffd23f" emissive="#ffd23f" emissiveIntensity={0.4} />
    </mesh>
  );
}

/** Notes when this camera's pieces last ran. */
function RunTracker({ log, index }: { log: RefObject<RunLog>; index: number }) {
  const camera = useVirtualCamera();
  const clock = useThree((state) => state.clock);
  useEffect(
    () => camera.addExtension({ update: () => void (log.current[index] = clock.elapsedTime) }),
    [camera, clock, log, index],
  );
  return null;
}

/** Shows how many cameras ran this frame. Mounted after `<Klipp>`, so it reads after the cameras ran. */
function RunCount({ log, count }: { log: RefObject<RunLog>; count: number }) {
  const labelRef = useRef<HTMLDivElement>(null);
  useFrame(({ clock }) => {
    let ran = 0;
    for (let i = 0; i < count; i++) if (log.current[i] === clock.elapsedTime) ran++;
    if (labelRef.current) labelRef.current.textContent = `${ran} of ${count} cameras updated this frame`;
  });

  return (
    <CanvasOverlay>
      <div className="blend-progress">
        <div ref={labelRef} className="blend-progress-label" />
      </div>
    </CanvasOverlay>
  );
}

export function StandbyUpdate() {
  const runnerRef = useRef<Mesh>(null);
  const log = useRef<RunLog>([]);

  const { standbyUpdate, cameras, active } = useControls('StandbyUpdate', {
    standbyUpdate: { value: 'roundRobin' as StandbyUpdateMode, options: modes },
    cameras: { value: 16, min: 2, max: 32, step: 1 },
    active: { value: 1, min: 1, max: 32, step: 1 },
  });
  const live = Math.min(active, cameras) - 1;

  return (
    <>
      <Runner meshRef={runnerRef} />
      <GroundClutter layout="standard" />

      <Klipp defaultBlend={{ damping: 0.4 }}>
        {Array.from({ length: cameras }, (_, i) => {
          const angle = (i / cameras) * Math.PI * 2;
          const position: [number, number, number] = [
            Math.cos(angle) * ringRadius,
            ringHeight,
            Math.sin(angle) * ringRadius,
          ];
          return (
            <VirtualCamera key={i} name={`camera-${i}`} priority={i === live ? 10 : 0} standbyUpdate={standbyUpdate}>
              <Body.HardLockToTarget target={position} />
              <Aim.HardLookAt target={runnerRef} />
              <RunTracker log={log} index={i} />
              <SpectatorFrustum color={i === live ? '#ff6b4a' : '#21a9e0'} maxDistance={2} />
            </VirtualCamera>
          );
        })}
      </Klipp>

      <RunCount log={log} count={cameras} />
    </>
  );
}
