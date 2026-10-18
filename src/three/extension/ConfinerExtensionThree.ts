import type { Box3, Sphere } from 'three';

import type { ConfinerBounds } from '../../core/extension/confiner';
import { ConfinerExtension } from '../../core/extension/ConfinerExtension';

/** A three.js `Box3` or `Sphere`, or core bounds. */
export type ConfinerBoundsThree = Box3 | Sphere | ConfinerBounds | null;

/** `ConfinerExtension` reading a three.js `Box3` or `Sphere`, also when it changes. */
export class ConfinerExtensionThree extends ConfinerExtension<ConfinerBoundsThree> {
  private readonly box: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  private readonly sphere = { center: [0, 0, 0] as [number, number, number], radius: 0 };

  protected override readBounds(): ConfinerBounds | null {
    const bounds = this.bounds;
    if (bounds && 'isBox3' in bounds) {
      const { min, max } = bounds;
      this.box[0] = min.x;
      this.box[1] = min.y;
      this.box[2] = min.z;
      this.box[3] = max.x;
      this.box[4] = max.y;
      this.box[5] = max.z;
      return this.box;
    }
    if (bounds && 'isSphere' in bounds) {
      bounds.center.toArray(this.sphere.center);
      this.sphere.radius = bounds.radius;
      return this.sphere;
    }
    return bounds;
  }
}
