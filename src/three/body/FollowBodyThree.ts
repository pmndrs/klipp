import * as follow from '../../core/body/follow';
import * as targetPose from '../../core/TargetPose';
import { FollowBody, type FollowOptions as FollowCoreOptions } from '../../core/body/FollowBody';
import type { TargetPose } from '../../core/TargetPose';

import { readTargetPose } from '../readTargetPose';

import { optionalVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

export type FollowThreeOptions = Omit<FollowCoreOptions, 'offset'> & {
  /** Offset from the target, rotated according to `bindingMode`. */
  offset?: Vector3Like;
};

/** Follows an `Object3D`, ref or fixed point with an offset rotated according to `bindingMode`. */
export class FollowBodyThree extends FollowBody<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  constructor(target: Target, { offset, ...options }: FollowThreeOptions = {}) {
    super(target, { ...options, offset: optionalVec3(offset) });
  }

  protected override readTarget(): TargetPose | null {
    const withRotation = follow.needsTargetRotation(this.state, this);
    return readTargetPose(this.pose, this.target, this.targetSlot, withRotation) ? this.pose : null;
  }
}
