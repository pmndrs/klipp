import { quat, vec3, type Quat, type Vec3 } from 'math';
import { Vector3, type Quaternion } from 'three';

import * as orbitFollow from '../../core/body/orbitFollow';
import * as targetPose from '../../core/targetPose';
import { OrbitFollowBody, type OrbitFollowOptions } from '../../core/body/OrbitFollowBody';
import type { EaseOptions } from '../../core/input/axis';
import type { TargetPose } from '../../core/targetPose';

import { readTargetPose } from '../readTargetPose';

import { resolveQuat } from '../resolve/resolveQuat';
import { optionalVec3, resolveVec3, resolveVector3, type Vector3Like } from '../resolve/resolveVector3';
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

  override setFromPosition(position: Vector3Like, options?: EaseOptions): void {
    super.setFromPosition(resolveVec3(this.scratchPosition, position), options);
  }

  override setFromRotation(rotation: Quaternion | Quat, options?: EaseOptions): void {
    super.setFromRotation(resolveQuat(this.scratchRotation, rotation), options);
  }

  override forward<V extends Vector3 | Vec3>(out: V, flatten = false): V {
    if (out instanceof Vector3) resolveVector3(out, super.forward(this.scratchPosition, flatten));
    else super.forward(out, flatten);
    return out;
  }

  protected override readTarget(): TargetPose | null {
    const withRotation = orbitFollow.needsTargetRotation(this.state, this);
    return readTargetPose(this.pose, this.target, withRotation, this.targetSlot) ? this.pose : null;
  }
}
