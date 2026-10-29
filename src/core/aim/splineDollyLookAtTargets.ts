import { clamp, quat, smoothstep, vec3, type Quat, type Vec3 } from 'math';

import * as spline from '../spline';
import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';
import type { Spline, SplinePositionUnits } from '../spline';

import { lookRotation } from './lookRotation';

/** A point to look at once the camera reaches `position` on the dolly's path, in the dolly's `positionUnits`. */
export type SplineDollyLookAtTarget<T = Vec3> = { position: number; lookAt: T };

export type SplineDollyLookAtTargetsParams<T = Vec3> = {
  /** Points to look at along the path. Without any, the camera looks the way the path runs. */
  targets: SplineDollyLookAtTarget<T>[];
  /**
   * How long the view stays on each target: `0` turns at an even pace, `1` holds it for the first and last third
   * of the way between targets.
   */
  easing: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = <T = Vec3>(
  settings?: Partial<SplineDollyLookAtTargetsParams<NoInfer<T>>>,
): SplineDollyLookAtTargetsParams<T> => withDefaults({ targets: [], easing: 0 }, settings);

export type SplineDollyLookAtTargetsState = {
  /** The point looked at in the last update. */
  lookAt: Vec3;
};

export const createState = (): SplineDollyLookAtTargetsState => ({ lookAt: [0, 0, 0] });

const tangent: Vec3 = [0, 0, 0];
const fromDirection: Vec3 = [0, 0, 0];
const toDirection: Vec3 = [0, 0, 0];
const direction: Vec3 = [0, 0, 0];
const flatFrom: Vec3 = [0, 0, 0];
const flatTo: Vec3 = [0, 0, 0];
const pan: Quat = [0, 0, 0, 1];

/** The share of the way between two targets the view holds on each of them, at full `easing`. */
const holdShare = 1 / 3;

/** Rotates `out` toward the targets around `distance` along `path`, or along the path without any. */
export function update(
  out: CameraState,
  state: SplineDollyLookAtTargetsState,
  params: SplineDollyLookAtTargetsParams,
  path: Spline,
  units: SplinePositionUnits,
  distance: number,
): void {
  if (params.targets.length === 0) {
    out.hasLookAtTarget = false;
    spline.tangentAt(tangent, path, distance);
    if (vec3.squaredLength(tangent) === 0) return;
    vec3.add(state.lookAt, out.position, tangent);
    lookRotation(out.quaternion, out.position, state.lookAt, out.referenceUp, out.quaternion);
    return;
  }
  lookPoint(state.lookAt, out, params, path, units, distance);
  lookRotation(out.quaternion, out.position, state.lookAt, out.referenceUp, out.quaternion);
  vec3.copy(out.lookAtTarget, state.lookAt);
  out.hasLookAtTarget = true;
}

/** Writes the point to look at between the targets just behind and just ahead of `distance`, eased by `easing`. */
function lookPoint(
  out: Vec3,
  camera: CameraState,
  { targets, easing }: SplineDollyLookAtTargetsParams,
  path: Spline,
  units: SplinePositionUnits,
  distance: number,
): void {
  let behind = -1;
  let ahead = -1;
  let first = 0;
  let last = 0;
  let behindDistance = -Infinity;
  let aheadDistance = Infinity;
  let firstDistance = Infinity;
  let lastDistance = -Infinity;
  for (let i = 0; i < targets.length; i++) {
    const at = spline.toDistance(path, targets[i].position, units);
    if (at <= distance && at > behindDistance) {
      behind = i;
      behindDistance = at;
    }
    if (at > distance && at < aheadDistance) {
      ahead = i;
      aheadDistance = at;
    }
    if (at < firstDistance) {
      first = i;
      firstDistance = at;
    }
    if (at > lastDistance) {
      last = i;
      lastDistance = at;
    }
  }
  // On a closed path the targets go round: before the first one comes the last, after the last one the first.
  if (path.closed) {
    if (behind < 0) {
      behind = last;
      behindDistance = lastDistance - path.length;
    }
    if (ahead < 0) {
      ahead = first;
      aheadDistance = firstDistance + path.length;
    }
  }
  if (behind < 0 || ahead < 0 || behind === ahead) {
    vec3.copy(out, targets[behind < 0 ? ahead : behind].lookAt);
    return;
  }
  const t = (distance - behindDistance) / (aheadDistance - behindDistance);
  const amount = clamp(easing, 0, 1);
  const eased = t + amount * (smoothstep(amount * holdShare, 1 - amount * holdShare, t) - t);
  turnBetween(out, camera, targets[behind].lookAt, targets[ahead].lookAt, eased);
}

/**
 * Writes the point `t` of the way from `from` to `to` as seen from the camera, panning round `referenceUp` and tilting
 * separately, so the view never dips between them.
 */
function turnBetween(out: Vec3, camera: CameraState, from: Vec3, to: Vec3, t: number): void {
  const up = camera.referenceUp;
  const fromLength = vec3.length(vec3.subtract(fromDirection, from, camera.position));
  const toLength = vec3.length(vec3.subtract(toDirection, to, camera.position));
  if (fromLength === 0 || toLength === 0) {
    vec3.lerp(out, from, to, t);
    return;
  }
  const fromTilt = Math.asin(clamp(vec3.dot(fromDirection, up) / fromLength, -1, 1));
  const toTilt = Math.asin(clamp(vec3.dot(toDirection, up) / toLength, -1, 1));
  vec3.scaleAndAdd(flatFrom, fromDirection, up, -vec3.dot(fromDirection, up));
  vec3.scaleAndAdd(flatTo, toDirection, up, -vec3.dot(toDirection, up));
  if (vec3.squaredLength(flatFrom) < 1e-12 || vec3.squaredLength(flatTo) < 1e-12) {
    vec3.lerp(out, from, to, t);
    return;
  }
  vec3.normalize(flatFrom, flatFrom);
  vec3.normalize(flatTo, flatTo);
  quat.setAxisAngle(pan, up, vec3.signedAngle(flatFrom, flatTo, up) * t);
  vec3.transformQuat(direction, flatFrom, pan);
  const tilt = fromTilt + (toTilt - fromTilt) * t;
  vec3.scale(direction, direction, Math.cos(tilt));
  vec3.scaleAndAdd(direction, direction, up, Math.sin(tilt));
  vec3.scaleAndAdd(out, camera.position, direction, fromLength + (toLength - fromLength) * t);
}
