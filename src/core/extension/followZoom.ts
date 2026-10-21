import { clamp, degreesToRadians, radiansToDegrees, vec3, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import * as damping from '../damping/damping';
import type { DamperState, DampingConstant } from '../damping/damping';

export type FollowZoomParams = {
  /** How wide the shot is at the target's distance, in world units. */
  width: number;
  /** Seconds to settle on a new field of view. `0` is instant. */
  damping: DampingConstant;
  /** Lowest and highest field of view it sets, in degrees, within `[1, 179]`. */
  fovRange: [number, number];
  /** Viewport width divided by height. */
  aspect: number;
  /** Whether the camera is orthographic, so `width` sets `orthographicSize` at any distance. */
  orthographic: boolean;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<FollowZoomParams>): FollowZoomParams =>
  withDefaults({ width: 2, damping: 1, fovRange: [3, 60], aspect: 1, orthographic: false }, settings);

export type FollowZoomState = {
  damper: DamperState;
  /** The field of view it set last frame. */
  fov: number;
};

export const createState = (): FollowZoomState => ({ damper: damping.createState(), fov: 0 });

const MIN_DISTANCE = 1e-4;

/** How wide a `fov` (vertical, in degrees) sees at `distance`. */
const widthAt = (distance: number, fov: number, aspect: number): number =>
  2 * distance * Math.tan(degreesToRadians(fov) / 2) * aspect;

/**
 * Sets `out.fov` so the shot is `params.width` wide at `target`, or `out.orthographicSize` for an orthographic
 * camera. A `null` target leaves it as is.
 */
export function update(
  out: CameraState,
  state: FollowZoomState,
  params: FollowZoomParams,
  target: Vec3 | null,
  dt: number,
  justActivated: boolean,
): void {
  if (!target) return;
  if (justActivated) damping.reset(state.damper);

  const { aspect } = params;
  const instant = typeof params.damping === 'number' && params.damping <= 0;
  if (params.orthographic) {
    const width = instant ? params.width : damping.damp(state.damper, params.width, params.damping, dt).value;
    out.orthographicSize = width / (2 * aspect);
    return;
  }

  const maxFov = clamp(params.fovRange[1], 1, 179);
  const minFov = clamp(params.fovRange[0], 1, maxFov);
  const distance = vec3.distance(out.position, target);
  let fov = maxFov;
  if (distance > MIN_DISTANCE) {
    let width = clamp(params.width, widthAt(distance, minFov, aspect), widthAt(distance, maxFov, aspect));
    if (!instant) {
      if (state.damper.hasUpdated) state.damper.value = widthAt(distance, state.fov, aspect);
      width = damping.damp(state.damper, width, params.damping, dt).value;
    }
    fov = radiansToDegrees(2 * Math.atan(width / aspect / (2 * distance)));
  }
  state.fov = out.fov = clamp(fov, minFov, maxFov);
}
