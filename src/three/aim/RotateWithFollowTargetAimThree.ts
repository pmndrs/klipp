import {
  RotateWithFollowTargetAim,
  type RotateWithFollowTargetOptions,
} from '../../core/aim/RotateWithFollowTargetAim';
import type { TargetPose } from '../../core/TargetPose';
import * as targetPose from '../../core/TargetPose';
import { readTargetRotation } from '../readTargetPose';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

export type { RotateWithFollowTargetOptions };

/** Follows the rotation of an `Object3D` or ref. */
export class RotateWithFollowTargetAimThree extends RotateWithFollowTargetAim<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  protected override readTarget(): TargetPose {
    this.pose.hasRotation = readTargetRotation(this.pose.rotation, this.target, this.targetSlot);
    return this.pose;
  }
}
