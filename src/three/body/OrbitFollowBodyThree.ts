import { quat, vec3, type Quat } from 'math';
import type { Quaternion } from 'three';

import * as orbitFollow from '../../core/body/orbitFollow';
import * as targetPose from '../../core/targetPose';
import { OrbitFollowBody, type OrbitFollowOptions } from '../../core/body/OrbitFollowBody';
import type { TargetPose } from '../../core/targetPose';

import { readTargetPose } from '../readTargetPose';

import { resolveQuat } from '../resolve/resolveQuat';
import { optionalVec3, resolveVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

export type OrbitFollowThreeOptions = Omit<OrbitFollowOptions, 'targetOffset'> & {
  /** Center of the orbit relative to the target, rotated according to `bindingMode`. */
  targetOffset?: Vector3Like;
};

/** Orbits an `Object3D`, ref or fixed point, driven by `horizontal`, `vertical` and `radial`. */
export class OrbitFollowBodyThree extends OrbitFollowBody<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();
  private readonly scratchPosition = vec3.create();
  private readonly scratchRotation = quat.create();

  constructor(target: Target, { targetOffset, ...options }: OrbitFollowThreeOptions = {}) {
    super(target, { ...options, targetOffset: optionalVec3(targetOffset) });
  }

  override setFromPosition = (position: Vector3Like): void => {
    const pose = this.readTarget();
    if (pose) orbitFollow.setFromPosition(this.state, this, pose, resolveVec3(this.scratchPosition, position));
  };

  override setFromRotation = (rotation: Quaternion | Quat): void => {
    const pose = this.readTarget();
    if (pose) orbitFollow.setFromRotation(this.state, this, pose, resolveQuat(this.scratchRotation, rotation));
  };

  protected override readTarget(): TargetPose | null {
    const withRotation = orbitFollow.needsTargetRotation(this.state, this);
    return readTargetPose(this.pose, this.target, withRotation, this.targetSlot) ? this.pose : null;
  }
}
