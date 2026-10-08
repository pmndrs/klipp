import * as tracker from '../../core/body/tracker';
import * as targetPose from '../../core/TargetPose';
import { OrbitFollowBody, type OrbitFollowOptions } from '../../core/body/OrbitFollowBody';
import type { TargetPose } from '../../core/TargetPose';

import { readTargetPose } from '../readTargetPose';

import { optionalVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

export type OrbitFollowThreeOptions = Omit<OrbitFollowOptions, 'targetOffset'> & {
  /** Center of the orbit relative to the target, rotated according to `bindingMode`. */
  targetOffset?: Vector3Like;
};

/** Orbits an `Object3D`, ref or fixed point on a sphere driven by `horizontal`, `vertical` and `radial`. */
export class OrbitFollowBodyThree extends OrbitFollowBody<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();

  constructor(target: Target, { targetOffset, ...options }: OrbitFollowThreeOptions = {}) {
    super(target, { ...options, targetOffset: optionalVec3(targetOffset) });
  }

  protected override readTarget(): TargetPose | null {
    const withRotation = tracker.needsTargetRotation(this.state.tracker, this.bindingMode);
    return readTargetPose(this.pose, this.target, this.targetSlot, withRotation) ? this.pose : null;
  }
}
