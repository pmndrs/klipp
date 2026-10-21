import * as positionComposer from '../../core/body/positionComposer';
import * as targetPose from '../../core/targetPose';
import { PositionComposerBody, type PositionComposerOptions } from '../../core/body/PositionComposerBody';
import type { TargetPose } from '../../core/targetPose';

import { readTargetExtent } from '../readTargetExtent';
import { readTargetPose } from '../readTargetPose';

import { optionalVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

export type PositionComposerThreeOptions = Omit<PositionComposerOptions, 'targetOffset'> & {
  /** Offset from the target, in its local space. */
  targetOffset?: Vector3Like;
  /** Target radius used when composing its visible edge. Ignored when `size` is set. */
  radius?: number;
  /** Target dimensions used when composing its visible edges. Measured automatically for meshes. */
  size?: Vector3Like;
};

/** Positions the camera around an `Object3D`, ref or fixed point, measuring its size from geometry. */
export class PositionComposerBodyThree extends PositionComposerBody<Target> {
  targetSlot: TargetSlot | null = null;
  radius?: number;
  size?: Vector3Like;

  private readonly pose = targetPose.create();
  private forceSizeRecalculation = false;

  constructor(target: Target, { targetOffset, radius, size, ...options }: PositionComposerThreeOptions = {}) {
    super(target, { ...options, targetOffset: optionalVec3(targetOffset) });
    this.radius = radius;
    this.size = size;
  }

  /** Forces the auto-detected `size` to be re-measured on the next `update()`, then goes back to the cached value. */
  recalculateSize(): void {
    this.forceSizeRecalculation = true;
  }

  protected override readTarget(): TargetPose | null {
    if (!readTargetPose(this.pose, this.target, true, this.targetSlot)) return null;
    if (positionComposer.needsExtent(this)) {
      readTargetExtent(
        this.pose.extent,
        this.target,
        this.size,
        this.radius,
        this.forceSizeRecalculation,
        this.targetSlot,
      );
    }
    this.forceSizeRecalculation = false;
    return this.pose;
  }
}
