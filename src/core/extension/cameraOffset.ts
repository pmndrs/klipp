import { vec3, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import * as cameraSpace from '../aim/cameraSpace';
import { lookRotation } from '../aim/lookRotation';

export type CameraOffsetParams = {
  /** How far to move the camera in its own space: x right, y up, z back. */
  offset: Vec3;
  /** Turn the camera so the look-at target stays where it was on screen, instead of moving the view with it. */
  preserveComposition: boolean;
  /** Whether the camera is orthographic, so a place on screen is a sideways offset rather than a direction. */
  orthographic: boolean;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<CameraOffsetParams>): CameraOffsetParams =>
  withDefaults({ offset: [0, 0, 0], preserveComposition: false, orthographic: false }, settings);

const scratchOffset: Vec3 = [0, 0, 0];
const scratchTargetDirection: Vec3 = [0, 0, 0];
const scratchLookAt: Quat = [0, 0, 0, 1];

/** Moves `out` by `params.offset` in the camera's own space. */
export function update(out: CameraState, params: CameraOffsetParams): void {
  const { offset } = params;
  if (offset[0] === 0 && offset[1] === 0 && offset[2] === 0) return;

  const preserve = params.preserveComposition && out.hasLookAtTarget;
  if (preserve) cameraSpace.fromWorld(scratchTargetDirection, out.position, out.quaternion, out.lookAtTarget);
  vec3.transformQuat(scratchOffset, offset, out.quaternion);
  vec3.add(out.position, out.position, scratchOffset);

  // A target behind the camera has no place on screen to keep.
  if (preserve && scratchTargetDirection[2] < 0) {
    if (params.orthographic) {
      cameraSpace.placeAtDistance(scratchTargetDirection, vec3.distance(out.position, out.lookAtTarget));
    }
    lookRotation(scratchLookAt, out.position, out.lookAtTarget, out.referenceUp, out.quaternion);
    cameraSpace.rotateToDirection(out.quaternion, scratchLookAt, scratchTargetDirection);
  } else {
    vec3.add(out.lookAtTarget, out.lookAtTarget, scratchOffset);
  }
}
