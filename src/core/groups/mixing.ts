import type { Vec3 } from 'math';

import * as cameraState from '../cameraState';
import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import type { BlendHints } from '../blend/BlendHints';
import type { AngleContinuity } from '../blend/lerpCameraState';

export type MixingParams = {
  /** Weight of each child camera, by name. Its share of the shot is its weight over the sum; zero or less leaves it out. */
  weights: Record<string, number>;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<MixingParams>): MixingParams => withDefaults({ weights: {} }, settings);

/** The cameras mixed in on the last frame, in order, and the way round the target each step of the mix turned. */
export type MixingState = { order: string[]; angles: AngleContinuity[] };

export const createState = (): MixingState => ({ order: [], angles: [] });

/** A camera to mix in, like the cameras of a `KlippState`. */
export type MixedCamera = { state: CameraState; hints?: BlendHints };

/** The camera with the highest weight, the first one on a tie, or `null` while no weight is positive. */
export function dominant(params: MixingParams, cameras: ReadonlyMap<string, MixedCamera>): string | null {
  let best: string | null = null;
  let bestWeight = 0;
  for (const name in params.weights) {
    const weight = params.weights[name];
    if (weight > bestWeight && cameras.has(name)) {
      best = name;
      bestWeight = weight;
    }
  }
  return best;
}

/** Share of the camera named `name` in the mix, from `0` to `1`. */
export function share(params: MixingParams, cameras: ReadonlyMap<string, MixedCamera>, name: string): number {
  const weight = params.weights[name];
  if (!(weight > 0) || !cameras.has(name)) return 0;
  let total = 0;
  for (const other in params.weights) {
    const otherWeight = params.weights[other];
    if (otherWeight > 0 && cameras.has(other)) total += otherWeight;
  }
  return weight / total;
}

const scratch = cameraState.create();

/**
 * Writes the weighted average of `cameras` into `out`, with hint arcs around `up`. Returns `false`, leaving `out` as
 * is, while no weight is positive.
 */
export function mix(
  out: CameraState,
  state: MixingState,
  params: MixingParams,
  cameras: ReadonlyMap<string, MixedCamera>,
  up?: Vec3,
): boolean {
  let total = 0;
  let count = 0;
  let unchanged = true;
  for (const name in params.weights) {
    const weight = params.weights[name];
    const camera = cameras.get(name);
    if (!(weight > 0) || !camera) continue;
    total += weight;
    // A step mixes into the ones before it, so its way round starts over once they change.
    if (state.order[count] !== name) {
      state.order[count] = name;
      unchanged = false;
    }
    const angle = (state.angles[count] ??= { delta: NaN });
    if (!unchanged) angle.delta = NaN;
    count++;
    if (total === weight) cameraState.copy(out, camera.state);
    else cameraState.lerp(out, cameraState.copy(scratch, out), camera.state, weight / total, camera.hints, angle, up);
  }
  state.order.length = count;
  return total > 0;
}
