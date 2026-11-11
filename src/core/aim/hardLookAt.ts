import { vec3, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import { lookRotation } from './lookRotation';

export type HardLookAtParams = {
  /** Looks at the aim's own `target`, or at the point the Body tracks (`'body'`). */
  lookAt: 'target' | 'body';
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<HardLookAtParams>): HardLookAtParams =>
  withDefaults({ lookAt: 'target' }, settings);

/** Rotates `out` so `targetPosition` is dead-center. */
export function update(out: CameraState, targetPosition: Vec3): void {
  lookRotation(out.quaternion, out.position, targetPosition, out.referenceUp, out.quaternion);
  vec3.copy(out.lookAtTarget, targetPosition);
  out.hasLookAtTarget = true;
}
