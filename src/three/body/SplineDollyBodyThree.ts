import * as targetPose from '../../core/targetPose';
import { SplineDollyBody, type SplineDollyOptions } from '../../core/body/SplineDollyBody';
import type { Spline } from '../../core/spline';
import type { TargetPose } from '../../core/targetPose';

import { toSpline, type SplineSource } from '../createSpline';
import { readTargetPose } from '../readTargetPose';

import { optionalVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

export type SplineDollyThreeOptions = Omit<SplineDollyOptions<Target>, 'spline' | 'splineOffset'> & {
  /** The path to ride: a `CatmullRomCurve3`, the points it runs through, or a `Spline`. */
  spline?: SplineSource | Spline | null;
  /** Whether a path given as points loops back to the first one. */
  closed?: boolean;
  /** Offset from the path: x to the side, y up, z along it. */
  splineOffset?: Vector3Like;
};

/** Moves the camera along a path, keeping up with an `Object3D`, ref or fixed point when told to. */
export class SplineDollyBodyThree extends SplineDollyBody<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  constructor({ spline, closed, splineOffset, ...options }: SplineDollyThreeOptions = {}) {
    super({ ...options, spline: toSpline(spline, closed), splineOffset: optionalVec3(splineOffset) });
  }

  protected override readTarget(): TargetPose | null {
    return readTargetPose(this.pose, this.target, false, this.targetSlot) ? this.pose : null;
  }
}
