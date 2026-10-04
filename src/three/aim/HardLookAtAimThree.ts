import * as targetPose from '../../core/TargetPose';
import { HardLookAtAim } from '../../core/aim/HardLookAtAim';
import type { TargetPose } from '../../core/TargetPose';

import { readTargetPose } from '../readTargetPose';

import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

/** Rotates so an `Object3D`, ref or fixed point is dead-center. */
export class HardLookAtAimThree extends HardLookAtAim<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  protected override readTarget(): TargetPose | null {
    return readTargetPose(this.pose, this.target, this.targetSlot, false) ? this.pose : null;
  }
}
