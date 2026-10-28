import { clamp, vec3, type Vec3 } from 'math';

import * as spline from '../spline';
import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';
import type { Spline, SplinePositionUnits } from '../spline';

import * as damping from '../damping/damping';
import { BlendCurves, type Ease } from '../blend/BlendCurves';
import type { DampingConstant, DamperState } from '../damping/damping';

/** How a `duration` move repeats: not at all, from the start again, or back and forth. */
export type SplineDollyLoop = 'once' | 'loop' | 'pingPong';

/**
 * Moves the camera along the path by itself: `fixedSpeed` by `speed` positions per second, `duration` from `from` to
 * `to` in `duration` seconds, starting over from `from` on each activation.
 */
export type SplineAutomaticDolly =
  | { method: 'fixedSpeed'; speed: number }
  | { method: 'duration'; from: number; to: number; duration: number; curve?: Ease; loop?: SplineDollyLoop };

export type SplineDollyParams = {
  /** The path the camera rides, or `null` to leave the camera where it is. */
  spline: Spline | null;
  /**
   * Where on the path the camera heads, in `positionUnits`. Past the end of a closed path, it laps around. With a
   * `fixedSpeed` dolly, where it carries on from once changed; a `duration` dolly ignores it.
   */
  position: number;
  positionUnits: SplinePositionUnits;
  /** Offset from the path: x to the side, y up, z along it. */
  splineOffset: Vec3;
  /** Response time for travelling along the path. */
  damping: DampingConstant;
  /** Moves the camera by itself instead of by `position`, or `null` to leave it to `position`. */
  automaticDolly: SplineAutomaticDolly | null;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<SplineDollyParams>): SplineDollyParams =>
  withDefaults(
    {
      spline: null,
      position: 0,
      positionUnits: 'normalized',
      splineOffset: [0, 0, 0],
      damping: 0,
      automaticDolly: null,
    },
    settings,
  );

export type SplineDollyState = {
  /** Where on the path the camera heads this frame, in `positionUnits`: `position`, or the automatic dolly's. */
  position: number;
  /** The `position` setting last seen, so a `fixedSpeed` dolly notices it change. */
  positionSetting: number;
  /** Seconds since activation, and whole runs of a `duration` dolly since then. */
  elapsed: number;
  runs: number;
  /** Whether a `duration` dolly starts over on the next update. */
  startOver: boolean;
  /** Distance along the path the camera stands at, after damping. */
  distance: number;
  damper: DamperState;
  primed: boolean;
};

export const createState = (): SplineDollyState => ({
  position: 0,
  positionSetting: Number.NaN,
  elapsed: 0,
  runs: 0,
  startOver: false,
  distance: 0,
  damper: damping.createState(),
  primed: false,
});

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
  if (justActivated || state.startOver) {
    state.elapsed = 0;
    state.runs = 0;
    state.startOver = false;
  } else {
    state.elapsed += dt;
  }
  const path = params.spline;
  if (!path || path.knots.length === 0) return;

  advance(state, params, path, dt);
  damping.damp(state.damper, travelDistance(path, state.position, params.positionUnits), params.damping, dt);
  state.distance = spline.standardize(path, state.damper.value, 'distance');

  spline.pointAt(out.position, path, state.distance);
  addOffset(out.position, path, state.distance, params.splineOffset);
}

function advance(state: SplineDollyState, params: SplineDollyParams, path: Spline, dt: number): void {
  const { automaticDolly: dolly, positionUnits: units } = params;
  if (dolly?.method === 'duration') {
    const { from, to, duration, curve = BlendCurves.linear, loop = 'once' } = dolly;
    if (!(duration > 0)) {
      state.position = to;
      return;
    }
    const runs = state.elapsed / duration;
    const progress = loop === 'once' ? Math.min(runs, 1) : loop === 'loop' ? runs % 1 : 1 - Math.abs((runs % 2) - 1);
    // Starting a run over jumps back to `from`: the damped camera jumps with it instead of travelling back.
    if (loop === 'loop' && Math.floor(runs) > state.runs) {
      shift(
        state,
        (Math.floor(runs) - state.runs) * (travelDistance(path, from, units) - travelDistance(path, to, units)),
      );
    }
    state.runs = Math.floor(runs);
    state.position = from + (to - from) * curve(progress);
    return;
  }
  if (params.position !== state.positionSetting) state.positionSetting = state.position = params.position;
  if (!dolly) return;

  state.position += dolly.speed * dt;
  const max = spline.maxPosition(path, units);
  if (!path.closed) {
    state.position = clamp(state.position, 0, max);
  } else if (max > 0 && (state.position < 0 || state.position >= max)) {
    const laps = Math.floor(state.position / max);
    state.position -= laps * max;
    shift(state, -laps * path.length);
  }
}

/** Moves the damped camera by `distance` along with its target, so it keeps its lag. */
function shift(state: SplineDollyState, distance: number): void {
  if (state.damper.hasUpdated) state.damper.value += distance;
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

/** Starts a `duration` dolly over from `from`, as it does each time its camera becomes the active one. */
export function startOver(state: SplineDollyState, params: SplineDollyParams): void {
  if (params.automaticDolly?.method !== 'duration') return;
  state.startOver = true;
  if (!state.primed) damping.reset(state.damper);
}

/** Start the next activation from the point of the path nearest to `position` instead of snapping. */
export function prime(state: SplineDollyState, params: SplineDollyParams, position: Vec3): void {
  if (!params.spline) return;
  damping.start(state.damper);
  state.damper.value = state.distance = spline.nearest(params.spline, position);
  state.primed = true;
}
