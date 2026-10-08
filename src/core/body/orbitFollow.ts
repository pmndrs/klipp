import { clamp, degreesToRadians, quat, radiansToDegrees, vec3, type Euler, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import { withDefaults } from '../params';
import type { TargetPose } from '../TargetPose';

import * as damping from '../damping/damping';
import type { DamperState, DampingConstant } from '../damping/damping';
import type { InputAxisParams } from '../input/axis';
import { InputAxis } from '../input/InputAxis';

import * as tracker from './tracker';
import { BindingModes, type BindingMode } from './BindingModes';
import { safeFromToRotation } from './safeFromToRotation';
import type { TrackerState } from './tracker';

export type OrbitFollowParams = {
  /** Distance from the target while `radial` is `0`. Changes ease in with `radial.damping`. */
  radius: number;
  /** Center of the orbit relative to the target, rotated according to `bindingMode`. */
  targetOffset: Vec3;
  /** Rotation frame the orbit is measured in. */
  bindingMode: BindingMode;
  /** Response time for following the target position. */
  damping: DampingConstant;
  /** Maximum damping speed, in world units/sec. */
  maxSpeed: number;
  /** What `horizontal` recenters to: its `center`, or the side behind the target's forward. */
  recenteringTarget: RecenteringTarget;
};

export type RecenteringTarget = 'axisCenter' | 'trackingTarget';

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<OrbitFollowParams>): OrbitFollowParams =>
  withDefaults(
    {
      radius: 10,
      targetOffset: [0, 0, 0],
      bindingMode: BindingModes.worldSpace,
      damping: 0,
      maxSpeed: Infinity,
      recenteringTarget: 'trackingTarget',
    },
    settings,
  );

/**
 * `horizontal` (around the target, wraps ±180°) and `vertical` (elevation) in degrees, and `radial` as the natural
 * log of the radius scale.
 */
export type OrbitFollowState = {
  horizontal: InputAxis;
  vertical: InputAxis;
  radial: InputAxis;
  radius: DamperState;
  tracker: TrackerState;
  /** Position set by `prime`, applied once a target is available. */
  primePosition: Vec3;
  primed: boolean;
};

type AxisSettings = Partial<InputAxisParams>;

/** Default settings of each axis. Every axis starts at its `center`. */
export const createAxisSettings = (): { horizontal: AxisSettings; vertical: AxisSettings; radial: AxisSettings } => ({
  horizontal: { center: 0, range: [-180, 180], wrap: true },
  vertical: { center: 17.5, range: [-90, 90] },
  radial: { center: 0, range: [Math.log(0.5), Math.log(2)] },
});

export function createState(): OrbitFollowState {
  const { horizontal, vertical, radial } = createAxisSettings();
  return {
    horizontal: new InputAxis({ ...horizontal, value: horizontal.center }),
    vertical: new InputAxis({ ...vertical, value: vertical.center }),
    radial: new InputAxis({ ...radial, value: radial.center }),
    radius: damping.createState(),
    tracker: tracker.createState(),
    primePosition: [0, 0, 0],
    primed: false,
  };
}

const recentersBehindTarget = (state: OrbitFollowState, params: OrbitFollowParams): boolean =>
  params.recenteringTarget === 'trackingTarget' && state.horizontal.recentering.enabled;

/** Whether `update` will read `target.rotation` this frame. */
export const needsTargetRotation = (state: OrbitFollowState, params: OrbitFollowParams): boolean =>
  tracker.needsTargetRotation(state.tracker, params.bindingMode) || recentersBehindTarget(state, params);

/** Start the next update from `position`'s direction around the target. `radial` keeps its value. */
export function prime(state: OrbitFollowState, position: Vec3): void {
  vec3.copy(state.primePosition, position);
  state.primed = true;
}

const poleLimit = 90 - 1e-3;
const worldUp: Vec3 = [0, 1, 0];
const forwardAxis: Vec3 = [0, 0, -1];
const scratchEuler: Euler = [0, 0, 0, 'yxz'];
const scratchRotation: Quat = [0, 0, 0, 1];
const scratchOffset: Vec3 = [0, 0, 0];
const scratchOrientation: Quat = [0, 0, 0, 1];
const scratchInverse: Quat = [0, 0, 0, 1];
const scratchDirection: Vec3 = [0, 0, 0];
const scratchPreviousOffset: Vec3 = [0, 0, 0];

function aimAxesFrom(state: OrbitFollowState, params: OrbitFollowParams, target: TargetPose, position: Vec3): void {
  tracker.referenceOrientation(scratchOrientation, state.tracker, params.bindingMode, target);
  vec3.transformQuat(scratchDirection, params.targetOffset, scratchOrientation);
  vec3.subtract(scratchDirection, position, vec3.add(scratchDirection, target.position, scratchDirection));
  vec3.transformQuat(scratchDirection, scratchDirection, quat.conjugate(scratchInverse, scratchOrientation));
  const x = scratchDirection[0];
  const y = scratchDirection[1];
  const z = scratchDirection[2];
  if (x * x + y * y + z * z < 1e-12) return;
  state.horizontal.setValue(radiansToDegrees(Math.atan2(-x, z)));
  state.vertical.setValue(radiansToDegrees(Math.atan2(y, Math.hypot(x, z))));
}

function centerBehindTarget(state: OrbitFollowState, params: OrbitFollowParams, target: TargetPose): void {
  if (!target.hasRotation) return;
  tracker.referenceOrientation(scratchOrientation, state.tracker, params.bindingMode, target);
  vec3.transformQuat(scratchDirection, forwardAxis, target.rotation);
  vec3.transformQuat(scratchDirection, scratchDirection, quat.conjugate(scratchInverse, scratchOrientation));
  const x = scratchDirection[0];
  const z = scratchDirection[2];
  if (x * x + z * z < 1e-12) return;
  state.horizontal.center = radiansToDegrees(Math.atan2(x, -z));
}

const isActive = (axis: InputAxis): boolean => axis.held || axis.hadDelta;

// Counting as input restarts the axis' recentering wait.
function shareInput(axis: InputAxis, other: InputAxis, otherActive: boolean): void {
  if (otherActive && other.recentering.time === axis.recentering.time) axis.hadDelta = true;
}

/** Input on one axis restarts the recentering wait of every axis with the same `recentering.time`. */
function syncRecentering({ horizontal, vertical, radial }: OrbitFollowState): void {
  const h = isActive(horizontal);
  const v = isActive(vertical);
  const r = isActive(radial);
  shareInput(horizontal, vertical, v);
  shareInput(horizontal, radial, r);
  shareInput(vertical, horizontal, h);
  shareInput(vertical, radial, r);
  shareInput(radial, horizontal, h);
  shareInput(radial, vertical, v);
}

/**
 * Advances the axes and places `out` on the orbit around the target. A `null` target leaves `out` as is.
 * Returns `true` while an axis still has to move.
 */
export function update(
  out: CameraState,
  state: OrbitFollowState,
  params: OrbitFollowParams,
  target: TargetPose | null,
  dt: number,
  justActivated: boolean,
): boolean {
  if (justActivated) {
    tracker.reset(state.tracker);
    damping.reset(state.radius);
    state.horizontal.idleTime = 0;
    state.vertical.idleTime = 0;
    state.radial.idleTime = 0;
  }
  if (target && recentersBehindTarget(state, params)) centerBehindTarget(state, params, target);
  syncRecentering(state);
  const horizontalMoving = state.horizontal.update(dt);
  const verticalMoving = state.vertical.update(dt);
  const radialMoving = state.radial.update(dt);
  const radius = damping.damp(state.radius, params.radius, state.radial.damping, dt).value;
  const moving = horizontalMoving || verticalMoving || radialMoving || radius !== params.radius;
  if (!target) return moving;
  if (state.primed) {
    state.primed = false;
    aimAxesFrom(state, params, target, state.primePosition);
  }

  // At a pole the horizontal angle no longer moves the camera, so the view could not turn with it.
  scratchEuler[0] = -degreesToRadians(clamp(state.vertical.value, -poleLimit, poleLimit));
  scratchEuler[1] = -degreesToRadians(state.horizontal.value);
  quat.fromEuler(scratchRotation, scratchEuler);
  vec3.set(scratchOffset, 0, 0, radius * Math.exp(state.radial.value));
  vec3.transformQuat(scratchOffset, scratchOffset, scratchRotation);

  const hadPrevious = state.tracker.hasPrevious;
  vec3.copy(scratchPreviousOffset, state.tracker.previousOffset);
  tracker.trackTarget(
    out.target,
    scratchOrientation,
    state.tracker,
    params,
    target,
    scratchOffset,
    params.targetOffset,
    dt,
  );
  vec3.add(out.position, out.target, vec3.transformQuat(scratchOffset, scratchOffset, scratchOrientation));
  out.hasTarget = true;
  vec3.transformQuat(out.referenceUp, worldUp, scratchOrientation);
  if (hadPrevious) {
    vec3.transformQuat(scratchPreviousOffset, scratchPreviousOffset, scratchOrientation);
    safeFromToRotation(out.rotationDampingBypass, scratchPreviousOffset, scratchOffset, out.referenceUp);
  }
  return moving;
}
