import { clamp, vec3, type Vec3 } from 'math';
import type { Box3, Sphere } from 'math/shapes';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

/** A box, `[minX, minY, minZ, maxX, maxY, maxZ]`, or a sphere, `{ center, radius }`. */
export type ConfinerBounds = Box3 | Sphere;

export type ConfinerParams = {
  /** Width of the zone inside the edge where the camera slows down, in world units. `0` stops it at the edge. */
  slowingDistance: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<ConfinerParams>): ConfinerParams =>
  withDefaults({ slowingDistance: 0 }, settings);

/**
 * `value` kept within `[min, max]`. Past `slowing` from an edge it eases in, so it moves less the farther it is
 * pushed, and never crosses the edge.
 */
function softClamp(value: number, min: number, max: number, slowing: number): number {
  const zone = Math.min(slowing, (max - min) / 2);
  if (!(zone > 0)) return clamp(value, min, max);
  const upper = max - zone;
  if (value > upper) return upper + zone * Math.tanh((value - upper) / zone);
  const lower = min + zone;
  if (value < lower) return lower - zone * Math.tanh((lower - value) / zone);
  return value;
}

/** `point` kept inside `bounds`, easing in over `slowingDistance` from the edge. */
export function confinePoint(out: Vec3, bounds: ConfinerBounds, point: Vec3, slowingDistance = 0): Vec3 {
  if (Array.isArray(bounds)) {
    return vec3.set(
      out,
      softClamp(point[0], bounds[0], bounds[3], slowingDistance),
      softClamp(point[1], bounds[1], bounds[4], slowingDistance),
      softClamp(point[2], bounds[2], bounds[5], slowingDistance),
    );
  }
  const distance = vec3.distance(point, bounds.center);
  if (distance === 0) return vec3.copy(out, point);
  const confined = softClamp(distance, -bounds.radius, bounds.radius, slowingDistance);
  return vec3.lerp(out, bounds.center, point, confined / distance);
}

/** Keeps `out.position` inside `bounds`. A `null` bounds leaves it as is. */
export function update(out: CameraState, params: ConfinerParams, bounds: ConfinerBounds | null): void {
  if (bounds) confinePoint(out.position, bounds, out.position, params.slowingDistance);
}
