import { clamp, degreesToRadians, quat, smoothstep, vec3, type Quat, type Vec3 } from 'math';

import * as spline from '../spline';
import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';
import type { Spline, SplinePositionUnits } from '../spline';

import * as splineDolly from '../body/splineDolly';

/** How far the path banks once the camera reaches `position` on it, in the dolly's `positionUnits`. */
export type SplineRollPoint = {
  position: number;
  /** In degrees, around the direction of travel, positive to the right. */
  roll: number;
};

export type SplineRollParams = {
  /** Where the path banks and how far. Without any, it doesn't. */
  points: SplineRollPoint[];
  /**
   * How long the roll stays at each point: `0` turns at an even pace, `1` holds it for the first and last third of
   * the way between points.
   */
  easing: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<SplineRollParams>): SplineRollParams =>
  withDefaults({ points: [], easing: 0 }, settings);

/** The share of the way between two points the roll holds on each of them, at full `easing`. */
const holdShare = 1 / 3;

const tangent: Vec3 = [0, 0, 0];
const rotation: Quat = [0, 0, 0, 1];
const offset: Vec3 = [0, 0, 0];
const leaned: Vec3 = [0, 0, 0];

/** Roll at `distance` along `path`, in degrees: between the points just behind and just ahead, eased by `easing`. */
export function rollAt(
  { points, easing }: SplineRollParams,
  path: Spline,
  units: SplinePositionUnits,
  distance: number,
): number {
  if (points.length === 0) return 0;
  let behind = -1;
  let ahead = -1;
  let first = 0;
  let last = 0;
  let behindDistance = -Infinity;
  let aheadDistance = Infinity;
  let firstDistance = Infinity;
  let lastDistance = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const at = spline.toDistance(path, points[i].position, units);
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
  // On a closed path the points go round: before the first one comes the last, after the last one the first.
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
  if (behind < 0 || ahead < 0 || behind === ahead) return points[behind < 0 ? ahead : behind].roll;
  const t = (distance - behindDistance) / (aheadDistance - behindDistance);
  const amount = clamp(easing, 0, 1);
  const eased = t + amount * (smoothstep(amount * holdShare, 1 - amount * holdShare, t) - t);
  return points[behind].roll + (points[ahead].roll - points[behind].roll) * eased;
}

/** Writes the turn of the roll at `distance` around the direction of travel. Returns `false` where there is none. */
function rollRotation(
  out: Quat,
  params: SplineRollParams,
  path: Spline,
  units: SplinePositionUnits,
  distance: number,
): boolean {
  const roll = rollAt(params, path, units, distance);
  if (roll === 0 || vec3.squaredLength(spline.tangentAt(tangent, path, distance)) === 0) return false;
  quat.setAxisAngle(out, tangent, degreesToRadians(roll));
  return true;
}

/** `up` turned around the direction of travel at `distance` by the roll there. */
export function upAt(
  out: Vec3,
  up: Vec3,
  params: SplineRollParams,
  path: Spline,
  units: SplinePositionUnits,
  distance: number,
): Vec3 {
  return rollRotation(rotation, params, path, units, distance)
    ? vec3.transformQuat(out, up, rotation)
    : vec3.copy(out, up);
}

/**
 * Turns `out.referenceUp` around the direction of travel at `distance` by the roll there, and the dolly's
 * `splineOffset` with it, so the camera banks with the path.
 */
export function update(
  out: CameraState,
  params: SplineRollParams,
  path: Spline,
  units: SplinePositionUnits,
  distance: number,
  splineOffset: Vec3 | null,
): void {
  if (!rollRotation(rotation, params, path, units, distance)) return;
  vec3.transformQuat(out.referenceUp, out.referenceUp, rotation);
  if (!splineOffset || (splineOffset[0] === 0 && splineOffset[1] === 0 && splineOffset[2] === 0)) return;
  // The dolly writes its position anew every frame, so the lean doesn't pile up.
  splineDolly.offsetAt(offset, path, distance, splineOffset);
  vec3.add(out.position, out.position, vec3.subtract(leaned, vec3.transformQuat(leaned, offset, rotation), offset));
}
