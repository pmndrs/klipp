import * as targetPose from '../../core/targetPose';
import { FollowZoomExtension } from '../../core/extension/FollowZoomExtension';
import type { TargetPose } from '../../core/targetPose';

import { readTargetPose } from '../readTargetPose';

import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

/** `FollowZoomExtension` keeping an `Object3D`, ref or fixed point the same size on screen. */
export class FollowZoomExtensionThree extends FollowZoomExtension<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  protected override readTarget(): TargetPose | null {
    return readTargetPose(this.pose, this.target, false, this.targetSlot) ? this.pose : null;
  }
}
