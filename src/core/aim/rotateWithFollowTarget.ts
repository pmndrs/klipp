import type { Quat } from 'math';
import type { CameraState } from '../CameraState';
import type { DamperState, DampingConstant } from '../damping/damping';
import * as damping from '../damping/damping';
import { withDefaults } from '../params';

export type RotateWithFollowTargetParams = {
  /** Spring response time to the target's rotation (or `{into, from}` for asymmetric damping). */
  damping: DampingConstant;
  /** Caps how fast `damping` can close the gap, in radians/sec. */
  maxSpeed: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<RotateWithFollowTargetParams>): RotateWithFollowTargetParams =>
  withDefaults({ damping: 0, maxSpeed: Infinity }, settings);

export type RotateWithFollowTargetState = { damper: DamperState; primed: boolean };

export const createState = (): RotateWithFollowTargetState => ({
  damper: damping.createState(),
  primed: false,
});

/** Turns `out` toward `targetRotation`, optionally damped. A `null` rotation leaves `out` as is. */
export function update(
  out: CameraState,
  state: RotateWithFollowTargetState,
  params: RotateWithFollowTargetParams,
  targetRotation: Quat | null,
  dt: number,
  justActivated: boolean,
): void {
  if (justActivated) {
    if (state.primed) state.primed = false;
    else damping.reset(state.damper);
  }
  if (!targetRotation) return;
  damping.dampQuaternion(state.damper, out.quaternion, targetRotation, params.damping, dt, params.maxSpeed);
}

/** Start the next activation from `rotation` instead of snapping to the target. */
export function prime(state: RotateWithFollowTargetState, params: RotateWithFollowTargetParams, rotation: Quat): void {
  damping.dampQuaternion(state.damper, rotation, rotation, params.damping, 0);
  state.primed = true;
}
