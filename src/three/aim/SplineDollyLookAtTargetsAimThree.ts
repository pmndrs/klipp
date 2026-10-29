import type { Vec3 } from 'math';
import { Vector3 } from 'three';

import { SplineDollyLookAtTargetsAim } from '../../core/aim/SplineDollyLookAtTargetsAim';

import { resolveTargetPosition, type Target } from '../resolve/Target';

const position = new Vector3();

/** Looks along the camera's spline dolly path, or at `Object3D`s, refs or fixed points placed along it. */
export class SplineDollyLookAtTargetsAimThree extends SplineDollyLookAtTargetsAim<Target> {
  protected override readLookAt(out: Vec3, lookAt: Target): boolean {
    if (!resolveTargetPosition(position, lookAt)) return false;
    position.toArray(out);
    return true;
  }
}
