import { mat4, quat, vec3, type Mat4, type Quat, type Vec3 } from 'math';

import type { TargetPose } from '../TargetPose';

import * as damping from '../damping/damping';
import type { DampingConstant, Vector3DamperState } from '../damping/damping';

import { BindingModes, type BindingMode } from './BindingModes';
import { safeFromToRotation } from './safeFromToRotation';

export type TrackerParams = {
  /** Rotation frame of the camera offset and the target offset. */
  bindingMode: BindingMode;
  /** Response time for following the target position. */
  damping: DampingConstant;
  /** Maximum damping speed, in world units/sec. */
  maxSpeed: number;
};

export type TrackerState = {
  /** Damped target position, the point the camera offset is added to. */
  trackedPoint: Vec3;
  previousOffset: Vec3;
  hasPrevious: boolean;
  damper: Vector3DamperState;
  /** Target rotation captured on entering `lockToTargetOnAssign`, valid while `assigned`. */
  assignedRotation: Quat;
  assigned: boolean;
};

export const createState = (): TrackerState => ({
  trackedPoint: [0, 0, 0],
  previousOffset: [0, 0, 0],
  hasPrevious: false,
  damper: damping.createVector3State(),
  assignedRotation: [0, 0, 0, 1],
  assigned: false,
});

/** Makes the next `trackTarget` snap to the target. */
export function reset(state: TrackerState): void {
  state.hasPrevious = false;
  damping.resetVector3(state.damper);
}

/** Whether `referenceOrientation` will read `target.rotation` this frame. */
export const needsTargetRotation = (state: Pick<TrackerState, 'assigned'>, bindingMode: BindingMode): boolean =>
  bindingMode !== BindingModes.worldSpace && !(bindingMode === BindingModes.lockToTargetOnAssign && state.assigned);

const worldUp: Vec3 = [0, 1, 0];
const forwardAxis: Vec3 = [0, 0, -1];
const origin: Vec3 = [0, 0, 0];
const scratchForward: Vec3 = [0, 0, 0];
const scratchLookMatrix: Mat4 = mat4.create();

/** The rotation `bindingMode` applies to offsets around `target`. Captures it on entering `lockToTargetOnAssign`. */
export function referenceOrientation(
  out: Quat,
  state: Pick<TrackerState, 'assignedRotation' | 'assigned'>,
  bindingMode: BindingMode,
  target: TargetPose,
): Quat {
  if (bindingMode !== BindingModes.lockToTargetOnAssign) state.assigned = false;
  if (bindingMode === BindingModes.worldSpace) return quat.identity(out);

  if (bindingMode === BindingModes.lockToTargetOnAssign) {
    if (!state.assigned) {
      state.assigned = true;
      if (target.hasRotation) quat.copy(state.assignedRotation, target.rotation);
      else quat.identity(state.assignedRotation);
    }
    return quat.copy(out, state.assignedRotation);
  }

  if (!target.hasRotation) return quat.identity(out);
  quat.copy(out, target.rotation);

  if (bindingMode === BindingModes.lockToTarget) return out;

  vec3.transformQuat(scratchForward, forwardAxis, out);
  if (bindingMode === BindingModes.lockToTargetWithWorldUp) scratchForward[1] = 0;
  if (vec3.squaredLength(scratchForward) < 1e-10) return out; // degenerate (straight up/down): keep the full rotation
  vec3.normalize(scratchForward, scratchForward);
  mat4.targetTo(scratchLookMatrix, origin, scratchForward, worldUp);
  return quat.fromMat4(out, scratchLookMatrix);
}

const scratchGoal: Vec3 = [0, 0, 0];
const scratchWorldOffset: Vec3 = [0, 0, 0];
const scratchPreviousOffset: Vec3 = [0, 0, 0];
const scratchRotation: Quat = [0, 0, 0, 1];
const scratchDelta: Vec3 = [0, 0, 0];
const scratchStep: Vec3 = [0, 0, 0];
const scratchFrame: Quat = [0, 0, 0, 1];
const scratchFrameInverse: Quat = [0, 0, 0, 1];

/**
 * Damps the tracked point toward the target position plus `targetOffset`, per axis of the camera `offset`'s frame.
 * When `offset` changes, the tracked point turns with it around the target, so moving the camera is never damped.
 * Writes the tracked point to `out` and the reference orientation to `outOrientation`.
 */
export function trackTarget(
  out: Vec3,
  outOrientation: Quat,
  state: TrackerState,
  params: TrackerParams,
  target: TargetPose,
  offset: Vec3,
  targetOffset: Vec3,
  dt: number,
): Vec3 {
  referenceOrientation(outOrientation, state, params.bindingMode, target);
  vec3.add(scratchGoal, target.position, vec3.transformQuat(scratchGoal, targetOffset, outOrientation));
  vec3.transformQuat(scratchWorldOffset, offset, outOrientation);

  if (state.hasPrevious && !vec3.exactEquals(state.previousOffset, offset)) {
    vec3.transformQuat(scratchPreviousOffset, state.previousOffset, outOrientation);
    safeFromToRotation(scratchRotation, scratchPreviousOffset, scratchWorldOffset, worldUp);
    vec3.subtract(scratchDelta, state.trackedPoint, scratchGoal);
    vec3.add(state.trackedPoint, scratchGoal, vec3.transformQuat(scratchDelta, scratchDelta, scratchRotation));
  }
  vec3.copy(state.previousOffset, offset);
  state.hasPrevious = true;

  vec3.cross(scratchDelta, scratchWorldOffset, worldUp);
  if (vec3.squaredLength(scratchDelta) < 1e-10) quat.copy(scratchFrame, outOrientation);
  else quat.fromMat4(scratchFrame, mat4.targetTo(scratchLookMatrix, origin, scratchWorldOffset, worldUp));
  quat.conjugate(scratchFrameInverse, scratchFrame);

  vec3.subtract(scratchDelta, scratchGoal, state.trackedPoint);
  vec3.transformQuat(scratchDelta, scratchDelta, scratchFrameInverse);
  vec3.zero(scratchStep);
  damping.dampVector3(state.damper, scratchStep, scratchDelta, params.damping, dt, params.maxSpeed);
  vec3.add(state.trackedPoint, state.trackedPoint, vec3.transformQuat(scratchStep, scratchStep, scratchFrame));
  return vec3.copy(out, state.trackedPoint);
}
