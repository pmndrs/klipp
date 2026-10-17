import * as cameraState from '../cameraState';
import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import type { BlendHints } from '../blend/BlendHints';

export type MixingParams = {
  /** Weight of each child camera, by name. Its share of the shot is its weight over the sum; zero or less leaves it out. */
  weights: Record<string, number>;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<MixingParams>): MixingParams => withDefaults({ weights: {} }, settings);

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

const scratch = cameraState.create();

/** Writes the weighted average of `cameras` into `out`. Returns `false`, leaving `out` as is, while no weight is positive. */
export function mix(out: CameraState, params: MixingParams, cameras: ReadonlyMap<string, MixedCamera>): boolean {
  let total = 0;
  for (const name in params.weights) {
    const weight = params.weights[name];
    const camera = cameras.get(name);
    if (!(weight > 0) || !camera) continue;
    total += weight;
    if (total === weight) cameraState.copy(out, camera.state);
    else cameraState.lerp(out, cameraState.copy(scratch, out), camera.state, weight / total, camera.hints);
  }
  return total > 0;
}
