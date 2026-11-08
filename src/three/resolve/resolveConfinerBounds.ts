import type { Box3 as Box3Math, Sphere as SphereMath } from 'math/shapes';
import type { Box3, Sphere } from 'three';

import type { ConfinerBounds } from '../../core/extension/confiner';

/** A three.js `Box3` or `Sphere`, or core bounds. */
export type ConfinerBoundsThree = Box3 | Sphere | ConfinerBounds | null;

/** Where `resolveConfinerBounds` writes three.js bounds, so they are read every frame without allocating. */
export type ConfinerBoundsScratch = { box: Box3Math; sphere: SphereMath };

export const createConfinerBoundsScratch = (): ConfinerBoundsScratch => ({
  box: [0, 0, 0, 0, 0, 0],
  sphere: { center: [0, 0, 0], radius: 0 },
});

/** `bounds` as core bounds, copied into `scratch` when they are a three.js `Box3` or `Sphere`. */
export function resolveConfinerBounds(
  scratch: ConfinerBoundsScratch,
  bounds: ConfinerBoundsThree,
): ConfinerBounds | null {
  if (bounds && 'isBox3' in bounds) {
    const { min, max } = bounds;
    const { box } = scratch;
    box[0] = min.x;
    box[1] = min.y;
    box[2] = min.z;
    box[3] = max.x;
    box[4] = max.y;
    box[5] = max.z;
    return box;
  }
  if (bounds && 'isSphere' in bounds) {
    bounds.center.toArray(scratch.sphere.center);
    scratch.sphere.radius = bounds.radius;
    return scratch.sphere;
  }
  return bounds;
}
