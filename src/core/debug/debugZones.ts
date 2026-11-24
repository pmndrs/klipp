import { clamp } from 'math';

import type { CameraState } from '../cameraState';

import * as cameraSpace from '../aim/cameraSpace';
import * as groupFraming from '../extension/groupFraming';
import type { GroupFramingParams } from '../extension/groupFraming';

export type DebugZone = {
  /** Zone center in normalized screen coordinates. */
  screenPosition: [number, number];
  /** Zone width and height. */
  size: [number, number];
  /** Which setting the zone shows, which also picks its style. */
  kind: 'deadZone' | 'hardLimit' | 'groupFraming';
};

/** A composer's hard limit and dead zone as boxes. Both are half-extents around `screenPosition`. */
export function composer(
  screenPosition: [number, number],
  deadZone: [number, number],
  hardLimit: [number, number],
): DebugZone[] {
  const zones: DebugZone[] = [];
  if (hardLimit[0] > 0 || hardLimit[1] > 0) {
    zones.push({ screenPosition, size: [hardLimit[0] * 2, hardLimit[1] * 2], kind: 'hardLimit' });
  }
  if (deadZone[0] > 0 || deadZone[1] > 0) {
    zones.push({ screenPosition, size: [deadZone[0] * 2, deadZone[1] * 2], kind: 'deadZone' });
  }
  return zones;
}

// Use the frustum plane distance for a padded box.
function paddingEdgeFraction(halfFov: number, distance: number, padding: number): number {
  return clamp(1 - padding / (distance * Math.sin(halfFov)), 0, 1);
}

/**
 * Size of group framing's padding boundary on screen, for a group `distance` away from a camera with `lens`. An axis
 * left out by `framingMode` spans the full frame.
 */
export function groupFramingPaddingBox(
  out: [number, number],
  params: Pick<GroupFramingParams, 'padding' | 'framingMode' | 'aspect' | 'freeHeight' | 'orthographic'>,
  lens: Pick<CameraState, 'fov' | 'orthographicSize'>,
  distance: number,
): [number, number] {
  const { padding, framingMode, aspect } = params;
  if (params.orthographic) {
    const size = lens.orthographicSize * params.freeHeight;
    out[0] = framingMode === 'vertical' ? 2 : clamp(1 - padding / (size * aspect), 0, 1) * 2;
    out[1] = framingMode === 'horizontal' ? 2 : clamp(1 - padding / size, 0, 1) * 2;
    return out;
  }
  const verticalHalfFov = cameraSpace.freeHalfFov(lens.fov, params.freeHeight);
  out[0] =
    framingMode === 'vertical'
      ? 2
      : paddingEdgeFraction(groupFraming.horizontalHalfFov(verticalHalfFov, aspect), distance, padding) * 2;
  out[1] = framingMode === 'horizontal' ? 2 : paddingEdgeFraction(verticalHalfFov, distance, padding) * 2;
  return out;
}
