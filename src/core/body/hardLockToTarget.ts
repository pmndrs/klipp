import { vec3, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import * as damping from '../damping/damping';
import type { DampingConstant, Vector3DamperState } from '../damping/damping';

export type HardLockToTargetParams = {
  /** Response time for following the target position. */
  damping: DampingConstant;
  /** Maximum damping speed, in world units/sec. */
  maxSpeed: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<HardLockToTargetParams>): HardLockToTargetParams =>
  withDefaults({ damping: 0, maxSpeed: Infinity }, settings);

export type HardLockToTargetState = { damper: Vector3DamperState; primed: boolean };

export const createState = (): HardLockToTargetState => ({ damper: damping.createVector3State(), primed: false });

/** Moves `out` onto `targetPosition`, optionally damped. A `null` target leaves `out` as is. */
export function update(
  out: CameraState,
  state: HardLockToTargetState,
  params: HardLockToTargetParams,
  targetPosition: Vec3 | null,
  dt: number,
  justActivated: boolean,
): void {
  if (justActivated) {
    if (state.primed) state.primed = false;
    else damping.resetVector3(state.damper);
  }
  if (!targetPosition) return;
  damping.dampVector3(out.position, state.damper, targetPosition, params.damping, dt, params.maxSpeed);
  vec3.copy(out.target, out.position);
  out.hasTarget = true;
}

/** Start the next activation from the camera's position instead of snapping to the target. */
export function prime(state: HardLockToTargetState): void {
  damping.startVector3(state.damper);
  state.primed = true;
}
