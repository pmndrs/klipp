import { vec3, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import { withDefaults } from '../params';
import type { TargetPose } from '../TargetPose';

import type { DampingConstant } from '../damping/damping';

import * as tracker from './tracker';
import { BindingModes, type BindingMode } from './BindingModes';
import type { TrackerState } from './tracker';

export type FollowParams = {
  /** Offset from the target, rotated according to `bindingMode`. */
  offset: Vec3;
  /** Response time for following the target position. */
  damping: DampingConstant;
  /** Response time for turning with the target, for every `bindingMode` but `worldSpace`. */
  rotationDamping: DampingConstant;
  /** Rotation frame used to interpret `offset`. */
  bindingMode: BindingMode;
  /** Maximum damping speed, in world units/sec. */
  maxSpeed: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<FollowParams>): FollowParams =>
  withDefaults(
    { offset: [0, 0, 10], damping: 0, rotationDamping: 0, bindingMode: BindingModes.lockToTarget, maxSpeed: Infinity },
    settings,
  );

export type FollowState = {
  tracker: TrackerState;
  /** Position set by `prime`, applied once a target is available. */
  primePosition: Vec3;
  primed: boolean;
};

export const createState = (): FollowState => ({
  tracker: tracker.createState(),
  primePosition: [0, 0, 0],
  primed: false,
});

/** Whether `update` will read `target.rotation` this frame. */
export const needsTargetRotation = (state: FollowState, params: FollowParams): boolean =>
  tracker.needsTargetRotation(state.tracker, params.bindingMode);

const worldUp: Vec3 = [0, 1, 0];
const noOffset: Vec3 = [0, 0, 0];
const scratchRotation: Quat = [0, 0, 0, 1];
const scratchRotatedOffset: Vec3 = [0, 0, 0];

function startFromPrime(state: FollowState, params: FollowParams, target: TargetPose): void {
  tracker.referenceOrientation(scratchRotation, state.tracker, params.bindingMode, target);
  vec3.transformQuat(scratchRotatedOffset, params.offset, scratchRotation);
  vec3.subtract(scratchRotatedOffset, state.primePosition, scratchRotatedOffset);
  tracker.prime(state.tracker, scratchRotatedOffset, params.offset, scratchRotation);
}

/** Moves `out` to the target position plus `offset`, rotated according to `bindingMode`. A `null` target leaves `out` as is. */
export function update(
  out: CameraState,
  state: FollowState,
  params: FollowParams,
  target: TargetPose | null,
  dt: number,
  justActivated: boolean,
): void {
  if (justActivated && !state.primed) tracker.reset(state.tracker);
  if (!target) return;
  if (state.primed) {
    state.primed = false;
    startFromPrime(state, params, target);
  }

  tracker.trackTarget(out.target, scratchRotation, state.tracker, params, target, params.offset, noOffset, dt);
  vec3.add(out.position, out.target, vec3.transformQuat(scratchRotatedOffset, params.offset, scratchRotation));
  out.hasTarget = true;
  vec3.transformQuat(out.referenceUp, worldUp, scratchRotation);
}

/** Start the next activation from `position` instead of snapping to the target. */
export function prime(state: FollowState, position: Vec3): void {
  vec3.copy(state.primePosition, position);
  state.primed = true;
}
