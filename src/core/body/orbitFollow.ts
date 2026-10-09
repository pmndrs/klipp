import { clamp, degreesToRadians, quat, radiansToDegrees, vec3, type Euler, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import { withDefaults } from '../params';
import type { TargetPose } from '../TargetPose';

import * as damping from '../damping/damping';
import type { DamperState, DampingConstant } from '../damping/damping';
import type { InputAxisParams } from '../input/axis';
import { InputAxis } from '../input/InputAxis';
import { shortestWrappedDelta } from '../input/shortestWrappedDelta';

import * as threeRing from './threeRing';
import * as tracker from './tracker';
import { BindingModes, type BindingMode } from './BindingModes';
import { safeFromToRotation } from './safeFromToRotation';
import type { Orbits, ThreeRingState } from './threeRing';
import type { TrackerState } from './tracker';

export type OrbitFollowParams = {
  /** Shape the camera moves on: a sphere of `radius`, or a surface through three `orbits`. */
  orbitStyle: OrbitStyle;
  /** Distance from the target while `radial` is `0`, for `sphere`. Changes ease in with `radial.damping`. */
  radius: number;
  /** Rings the `threeRing` surface passes through, from `vertical`'s minimum to its maximum. */
  orbits: Orbits;
  /** How strongly the `threeRing` surface curves between the rings, from `0` to `1`. */
  splineCurvature: number;
  /** Center of the orbit relative to the target, rotated according to `bindingMode`. */
  targetOffset: Vec3;
  /** Rotation frame the orbit is measured in. */
  bindingMode: BindingMode;
  /** Response time for following the target position. */
  damping: DampingConstant;
  /** Response time for turning with the target, for every `bindingMode` but `worldSpace`. */
  rotationDamping: DampingConstant;
  /** Maximum damping speed, in world units/sec. */
  maxSpeed: number;
  /** What `horizontal` recenters to: its `center`, or the side behind the target's forward. */
  recenteringTarget: RecenteringTarget;
};

export type OrbitStyle = 'sphere' | 'threeRing';

export type RecenteringTarget = 'axisCenter' | 'trackingTarget';

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<OrbitFollowParams>): OrbitFollowParams =>
  withDefaults(
    {
      orbitStyle: 'sphere',
      radius: 10,
      orbits: {
        top: { height: 10, radius: 10 },
        center: { height: 0, radius: 10 },
        bottom: { height: -10, radius: 10 },
      },
      splineCurvature: 0,
      targetOffset: [0, 0, 0],
      bindingMode: BindingModes.worldSpace,
      damping: 0,
      rotationDamping: 0,
      maxSpeed: Infinity,
      recenteringTarget: 'trackingTarget',
    },
    settings,
  );

/**
 * `horizontal` (around the target, wraps ±180°) and `vertical` (elevation, or from the bottom to the top ring) in
 * degrees, and `radial` as the natural log of the radius scale.
 */
export type OrbitFollowState = {
  horizontal: InputAxis;
  vertical: InputAxis;
  radial: InputAxis;
  radius: DamperState;
  threeRing: ThreeRingState;
  tracker: TrackerState;
  /** Binding frame of the last `update`. */
  orientation: Quat;
  /** Position set by `prime`, applied once a target is available. */
  primePosition: Vec3;
  primed: boolean;
};

type AxisSettings = Partial<InputAxisParams>;

/** Default settings of each axis. Every axis starts at its `center`. */
export const createAxisSettings = (): { horizontal: AxisSettings; vertical: AxisSettings; radial: AxisSettings } => ({
  horizontal: { center: 0, range: [-180, 180], wrap: true },
  vertical: { center: 0, range: [-90, 90] },
  radial: { center: 0, range: [Math.log(0.5), Math.log(2)] },
});

export function createState(): OrbitFollowState {
  const { horizontal, vertical, radial } = createAxisSettings();
  return {
    horizontal: new InputAxis({ ...horizontal, value: horizontal.center }),
    vertical: new InputAxis({ ...vertical, value: vertical.center }),
    radial: new InputAxis({ ...radial, value: radial.center }),
    radius: damping.createState(),
    threeRing: threeRing.createState(),
    tracker: tracker.createState(),
    orientation: [0, 0, 0, 1],
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
const backAxis: Vec3 = [0, 0, 1];
const scratchDirection: Vec3 = [0, 0, 0];
const scratchWorld: Vec3 = [0, 0, 0];
const scratchAxes: [number, number] = [0, 0];
const scratchPreviousOffset: Vec3 = [0, 0, 0];

/** Where `value` is within `axis`' range, from `0` to `1`. */
function normalize(axis: InputAxis, value: number): number {
  const range = axis.range;
  if (!range || range[1] <= range[0]) return 0.5;
  return clamp((value - range[0]) / (range[1] - range[0]), 0, 1);
}

/** The camera's offset from the tracked point at these axis values, in the binding frame. */
function orbitOffset(
  out: Vec3,
  state: OrbitFollowState,
  params: OrbitFollowParams,
  horizontal: number,
  vertical: number,
) {
  const scale = Math.exp(state.radial.value);
  if (params.orbitStyle === 'threeRing') {
    const t = normalize(state.vertical, vertical);
    threeRing.point(out, state.threeRing, params.orbits, params.splineCurvature, t);
    vec3.scale(out, out, scale);
    quat.setAxisAngle(scratchRotation, worldUp, -degreesToRadians(horizontal));
  } else {
    // At a pole the horizontal angle no longer moves the camera, so the view could not turn with it.
    scratchEuler[0] = -degreesToRadians(clamp(vertical, -poleLimit, poleLimit));
    scratchEuler[1] = -degreesToRadians(horizontal);
    quat.fromEuler(scratchRotation, scratchEuler);
    vec3.set(out, 0, 0, state.radius.value * scale);
  }
  return vec3.transformQuat(out, out, scratchRotation);
}

/** Where the camera would be at these axis values, around the tracked point and in the frame of the last `update`. */
export function point(
  out: Vec3,
  state: OrbitFollowState,
  params: OrbitFollowParams,
  horizontal: number,
  vertical: number,
): Vec3 {
  orbitOffset(out, state, params, horizontal, vertical);
  vec3.transformQuat(out, out, state.orientation);
  return vec3.add(out, out, state.tracker.trackedPoint);
}

function directionFrom(
  out: Vec3,
  state: OrbitFollowState,
  params: OrbitFollowParams,
  target: TargetPose,
  position: Vec3,
) {
  tracker.referenceOrientation(scratchOrientation, state.tracker, params.bindingMode, target);
  vec3.add(out, target.position, vec3.transformQuat(out, params.targetOffset, scratchOrientation));
  return vec3.subtract(out, position, out);
}

/** The `horizontal` and `vertical` values that put the camera along world `direction` from the orbit's center. */
function axesAlong(
  state: OrbitFollowState,
  params: OrbitFollowParams,
  target: TargetPose,
  direction: Vec3,
): [number, number] | null {
  tracker.referenceOrientation(scratchOrientation, state.tracker, params.bindingMode, target);
  vec3.transformQuat(scratchDirection, direction, quat.conjugate(scratchInverse, scratchOrientation));
  const x = scratchDirection[0];
  const y = scratchDirection[1];
  const z = scratchDirection[2];
  if (x * x + y * y + z * z < 1e-12) return null;
  scratchAxes[0] = radiansToDegrees(Math.atan2(-x, z));
  const elevation = Math.atan2(y, Math.hypot(x, z));
  const range = state.vertical.range;
  if (params.orbitStyle !== 'threeRing') scratchAxes[1] = radiansToDegrees(elevation);
  else if (range) scratchAxes[1] = range[0] + closestOrbitPoint(state, params, elevation) * (range[1] - range[0]);
  else scratchAxes[1] = state.vertical.value;
  return scratchAxes;
}

function easeAxesTo(state: OrbitFollowState, axes: [number, number] | null): void {
  if (!axes) return;
  const { horizontal, vertical } = state;
  const wrapped = horizontal.wrap && horizontal.range;
  horizontal.applyDelta(
    wrapped ? shortestWrappedDelta(horizontal.rawValue, axes[0], wrapped) : axes[0] - horizontal.rawValue,
  );
  vertical.applyDelta(axes[1] - vertical.rawValue);
}

/** Eases `horizontal` and `vertical` toward `position`'s direction around the target. `radial` keeps its value. */
export function setFromPosition(
  state: OrbitFollowState,
  params: OrbitFollowParams,
  target: TargetPose,
  position: Vec3,
): void {
  easeAxesTo(state, axesAlong(state, params, target, directionFrom(scratchWorld, state, params, target, position)));
}

/** Eases `horizontal` and `vertical` so the camera looks along `rotation`'s forward at the target. */
export function setFromRotation(
  state: OrbitFollowState,
  params: OrbitFollowParams,
  target: TargetPose,
  rotation: Quat,
): void {
  easeAxesTo(state, axesAlong(state, params, target, vec3.transformQuat(scratchWorld, backAxis, rotation)));
}

function primeAxes(state: OrbitFollowState, params: OrbitFollowParams, target: TargetPose, position: Vec3): void {
  const axes = axesAlong(state, params, target, directionFrom(scratchWorld, state, params, target, position));
  if (!axes) return;
  state.horizontal.setValue(axes[0]);
  state.vertical.setValue(axes[1]);
}

function elevationError(state: OrbitFollowState, params: OrbitFollowParams, t: number, elevation: number): number {
  threeRing.point(scratchDirection, state.threeRing, params.orbits, params.splineCurvature, t);
  return Math.abs(Math.atan2(scratchDirection[1], scratchDirection[2]) - elevation);
}

/** Where between the bottom (`0`) and top (`1`) ring the direction from the target is closest to `elevation`. */
function closestOrbitPoint(state: OrbitFollowState, params: OrbitFollowParams, elevation: number): number {
  const samples = 32;
  let best = 0;
  let bestError = Infinity;
  for (let i = 0; i <= samples; i++) {
    const error = elevationError(state, params, i / samples, elevation);
    if (error < bestError) {
      bestError = error;
      best = i / samples;
    }
  }
  for (let step = 0.5 / samples; step > 1e-7; step /= 2) {
    const below = clamp(best - step, 0, 1);
    const above = clamp(best + step, 0, 1);
    const belowError = elevationError(state, params, below, elevation);
    const aboveError = elevationError(state, params, above, elevation);
    if (belowError < bestError && belowError <= aboveError) {
      best = below;
      bestError = belowError;
    } else if (aboveError < bestError) {
      best = above;
      bestError = aboveError;
    }
  }
  return best;
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
  quat.identity(out.rotationDampingBypass);
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
    primeAxes(state, params, target, state.primePosition);
  }

  orbitOffset(scratchOffset, state, params, state.horizontal.value, state.vertical.value);

  const hadPrevious = state.tracker.hasPrevious;
  vec3.copy(scratchPreviousOffset, state.tracker.previousOffset);
  tracker.trackTarget(
    out.target,
    state.orientation,
    state.tracker,
    params,
    target,
    scratchOffset,
    params.targetOffset,
    dt,
  );
  vec3.add(out.position, out.target, vec3.transformQuat(scratchOffset, scratchOffset, state.orientation));
  out.hasTarget = true;
  vec3.transformQuat(out.referenceUp, worldUp, state.orientation);
  if (hadPrevious) {
    vec3.transformQuat(scratchPreviousOffset, scratchPreviousOffset, state.orientation);
    safeFromToRotation(out.rotationDampingBypass, scratchPreviousOffset, scratchOffset, out.referenceUp);
  }
  return moving;
}
