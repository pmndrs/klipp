import * as targetPose from '../../core/TargetPose';
import { PanTiltAim } from '../../core/aim/PanTiltAim';
import type { TargetPose } from '../../core/TargetPose';

import { readTargetRotation } from '../readTargetPose';

import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

/** `PanTiltAim` relative to an optional `Object3D` or ref's rotation. */
export class PanTiltAimThree extends PanTiltAim<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  protected override readTarget(): TargetPose {
    this.pose.hasRotation = readTargetRotation(this.pose.rotation, this.target, this.targetSlot);
    return this.pose;
  }
}
