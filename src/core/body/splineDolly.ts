import { vec3, type Vec3 } from 'math';

import * as spline from '../spline';
import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';
import type { Spline, SplinePositionUnits } from '../spline';

import * as damping from '../damping/damping';
import type { DampingConstant, DamperState } from '../damping/damping';

export type SplineDollyParams = {
  /** The path the camera rides, or `null` to leave the camera where it is. */
  spline: Spline | null;
  /** Where on the path the camera heads, in `positionUnits`. Past the end of a closed path, it laps around. */
  position: number;
  positionUnits: SplinePositionUnits;
  /** Offset from the path: x to the side, y up, z along it. */
  splineOffset: Vec3;
  /** Response time for travelling along the path. */
  damping: DampingConstant;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<SplineDollyParams>): SplineDollyParams =>
  withDefaults(
    { spline: null, position: 0, positionUnits: 'normalized', splineOffset: [0, 0, 0], damping: 0 },
    settings,
  );

export type SplineDollyState = {
  /** Distance along the path the camera stands at, after damping. */
  distance: number;
  damper: DamperState;
  primed: boolean;
};

export const createState = (): SplineDollyState => ({ distance: 0, damper: damping.createState(), primed: false });

const worldUp: Vec3 = [0, 1, 0];
const worldForward: Vec3 = [0, 0, 1];
const forward: Vec3 = [0, 0, 0];
const right: Vec3 = [0, 0, 0];
const up: Vec3 = [0, 0, 0];

/** Moves `out` to `position` on the path, damped along it. */
export function update(
  out: CameraState,
  state: SplineDollyState,
  params: SplineDollyParams,
  dt: number,
  justActivated: boolean,
): void {
  if (justActivated) {
    if (state.primed) state.primed = false;
    else damping.reset(state.damper);
  }
  const path = params.spline;
  if (!path || path.knots.length === 0) return;

  damping.damp(state.damper, travelDistance(path, params.position, params.positionUnits), params.damping, dt);
  state.distance = spline.standardize(path, state.damper.value, 'distance');

  spline.pointAt(out.position, path, state.distance);
  addOffset(out.position, path, state.distance, params.splineOffset);
}

/** Distance to `position` without wrapping, so a closed path is travelled the way `position` changes. */
function travelDistance(path: Spline, position: number, units: SplinePositionUnits): number {
  if (!path.closed) return spline.toDistance(path, position, units);
  const max = spline.maxPosition(path, units);
  if (!(max > 0)) return 0;
  const laps = Math.floor(position / max);
  return spline.toDistance(path, position - laps * max, units) + laps * path.length;
}

function addOffset(out: Vec3, path: Spline, distance: number, offset: Vec3): void {
  if (offset[0] === 0 && offset[1] === 0 && offset[2] === 0) return;
  spline.tangentAt(forward, path, distance);
  if (vec3.squaredLength(forward) === 0) vec3.copy(forward, worldForward);
  vec3.cross(right, forward, worldUp);
  if (vec3.squaredLength(right) < 1e-12) vec3.cross(right, forward, worldForward);
  vec3.normalize(right, right);
  vec3.cross(up, right, forward);
  vec3.scaleAndAdd(out, out, right, offset[0]);
  vec3.scaleAndAdd(out, out, up, offset[1]);
  vec3.scaleAndAdd(out, out, forward, offset[2]);
}

/** Start the next activation from the point of the path nearest to `position` instead of snapping. */
export function prime(state: SplineDollyState, params: SplineDollyParams, position: Vec3): void {
  if (!params.spline) return;
  damping.start(state.damper);
  state.damper.value = state.distance = spline.nearest(params.spline, position);
  state.primed = true;
}
