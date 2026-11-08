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

/** Whether `bounds` hold no point: a box with a min above its max, or a sphere with a negative radius. */
export const isEmpty = (bounds: ConfinerBounds): boolean =>
  Array.isArray(bounds) ? bounds[0] > bounds[3] || bounds[1] > bounds[4] || bounds[2] > bounds[5] : bounds.radius < 0;

/** `point` kept inside `bounds`, easing in over `slowingDistance` from the edge. Empty bounds keep it as is. */
export function confinePoint(out: Vec3, bounds: ConfinerBounds, point: Vec3, slowingDistance = 0): Vec3 {
  if (isEmpty(bounds)) return vec3.copy(out, point);
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

/**
 * Where a move from `from` to `to` along one axis ends within `[min, max]`. Within `slowing` of an edge, a move toward
 * it covers a shrinking share of the way left, so it nears the edge but never crosses it.
 */
function stepAxis(from: number, to: number, min: number, max: number, slowing: number): number {
  const zone = Math.min(slowing, (max - min) / 2);
  if (zone > 0 && to > from && to > max - zone) {
    const start = Math.max(from, max - zone);
    return clamp(max - (max - start) * Math.exp(-(to - start) / zone), min, max);
  }
  if (zone > 0 && to < from && to < min + zone) {
    const start = Math.min(from, min + zone);
    return clamp(min + (start - min) * Math.exp(-(start - to) / zone), min, max);
  }
  return clamp(to, min, max);
}

/**
 * Where a point moving from `from` to `to` ends inside `bounds`. Within `slowingDistance` of an edge it slows down as it
 * nears it and never crosses it. Moving away from an edge is never slowed. Empty bounds let it go to `to`.
 */
export function confineStep(out: Vec3, bounds: ConfinerBounds, from: Vec3, to: Vec3, slowingDistance = 0): Vec3 {
  if (isEmpty(bounds)) return vec3.copy(out, to);
  if (Array.isArray(bounds)) {
    return vec3.set(
      out,
      stepAxis(from[0], to[0], bounds[0], bounds[3], slowingDistance),
      stepAxis(from[1], to[1], bounds[1], bounds[4], slowingDistance),
      stepAxis(from[2], to[2], bounds[2], bounds[5], slowingDistance),
    );
  }
  const reached = vec3.distance(to, bounds.center);
  if (reached === 0) return vec3.copy(out, to);
  const distance = stepAxis(
    vec3.distance(from, bounds.center),
    reached,
    -bounds.radius,
    bounds.radius,
    slowingDistance,
  );
  return vec3.lerp(out, bounds.center, to, distance / reached);
}

/** Keeps `out.position` inside `bounds`. A `null` or empty bounds leaves it as is. */
export function update(out: CameraState, params: ConfinerParams, bounds: ConfinerBounds | null): void {
  if (bounds) confinePoint(out.position, bounds, out.position, params.slowingDistance);
}
