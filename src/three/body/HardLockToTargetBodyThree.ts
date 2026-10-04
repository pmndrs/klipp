import { HardLockToTargetBody, type HardLockToTargetOptions } from '../../core/body/HardLockToTargetBody';
import type { TargetPose } from '../../core/TargetPose';
import * as targetPose from '../../core/TargetPose';
import { readTargetPose } from '../readTargetPose';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

export type { HardLockToTargetOptions };

/** Locks the camera position to an `Object3D`, ref or fixed point, optionally with damping. */
export class HardLockToTargetBodyThree extends HardLockToTargetBody<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  protected override readTarget(): TargetPose | null {
    return readTargetPose(this.pose, this.target, this.targetSlot, false) ? this.pose : null;
  }
}
