import { vec3, type Vec3 } from 'math';

import type { CameraState } from '../CameraState';

import { lookRotation } from './lookRotation';

/** Rotates `out` so `targetPosition` is dead-center. */
export function update(out: CameraState, targetPosition: Vec3): void {
  lookRotation(out.quaternion, out.position, targetPosition, out.referenceUp, out.quaternion);
  vec3.copy(out.lookAtTarget, targetPosition);
  out.hasLookAtTarget = true;
}
