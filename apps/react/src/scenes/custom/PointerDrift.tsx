import { Damper, type CameraPiece } from '@pmndrs/klipp';
import { Aim, Body, Klipp, useVirtualCamera, VirtualCamera } from '@pmndrs/klipp/react';
import { useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useEffect } from 'react';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

/**
 * `turn` turns the shot toward the pointer by up to `amount` radians. `orbit` slides the camera up to `amount` units
 * toward it and turns back to the point the Aim looks at.
 */
type DriftMode = 'turn' | 'orbit';

const euler = new Euler();
const drift = new Quaternion();
const rotation = new Quaternion();
const right = new Vector3();
const up = new Vector3();
const eye = new Vector3();
const target = new Vector3();
const referenceUp = new Vector3();
const look = new Matrix4();

/** Moves the shot a little with the pointer, on top of the Body and Aim. `pointer` runs from -1 to 1. */
function pointerDrift(
  pointer: { x: number; y: number },
  mode: DriftMode,
  amount: number,
  damping: number,
): CameraPiece {
  const xDamper = new Damper();
  const yDamper = new Damper();
  let x = 0;
  let y = 0;

  return {
    update: (out, dt, justActivated) => {
      if (justActivated) {
        xDamper.reset();
        yDamper.reset();
      }

      const targetX = pointer.x * amount;
      const targetY = pointer.y * amount;
      x = xDamper.update(x, targetX, damping, dt);
      y = yDamper.update(y, targetY, damping, dt);

      rotation.fromArray(out.quaternion);
      if (mode === 'turn') {
        rotation.multiply(drift.setFromEuler(euler.set(y, -x, 0))).toArray(out.quaternion);
      } else {
        right.set(1, 0, 0).applyQuaternion(rotation);
        up.set(0, 1, 0).applyQuaternion(rotation);
        eye.fromArray(out.position).addScaledVector(right, x).addScaledVector(up, y).toArray(out.position);
        if (out.hasLookAtTarget) {
          look.lookAt(eye, target.fromArray(out.lookAtTarget), referenceUp.fromArray(out.referenceUp));
          rotation.setFromRotationMatrix(look).toArray(out.quaternion);
        }
      }
      return x !== targetX || y !== targetY;
    },
  };
}

function PointerDriftPiece({ mode, amount, damping }: { mode: DriftMode; amount: number; damping: number }) {
  const camera = useVirtualCamera();
  const pointer = useThree((state) => state.pointer);

  useEffect(
    () => camera.addExtension(pointerDrift(pointer, mode, amount, damping)),
    [camera, pointer, mode, amount, damping],
  );

  return null;
}

const isMode = (mode: DriftMode) => (get: (path: string) => unknown) => get('Custom piece: PointerDrift.mode') === mode;

export function PointerDrift() {
  const { mode, angle, distance, damping } = useControls('Custom piece: PointerDrift', {
    mode: { value: 'orbit' as DriftMode, options: ['turn', 'orbit'] as DriftMode[] },
    angle: { value: 0.12, min: 0, max: 0.5, step: 0.01, label: 'angle (rad)', render: isMode('turn') },
    distance: { value: 3, min: 0, max: 8, step: 0.1, label: 'distance (m)', render: isMode('orbit') },
    damping: { value: 0.5, min: 0, max: 2, step: 0.05 },
  });

  return (
    <>
      <mesh position={[0, 1.5, 0]}>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#ff6b4a" />
      </mesh>
      <GroundClutter layout="standard" />

      <Klipp>
        <VirtualCamera name="pointer-drift" priority={10}>
          <Body.HardLockToTarget target={[0, 2.5, 9]} />
          <Aim.HardLookAt target={[0, 1.5, 0]} />
          <PointerDriftPiece mode={mode} amount={mode === 'turn' ? angle : distance} damping={damping} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
