import { quat, vec3, type Quat, type Vec3 } from 'math';
import { Vector3, type Quaternion } from 'three';

import * as targetPose from '../../core/targetPose';
import { PanTiltAim } from '../../core/aim/PanTiltAim';
import type { EaseOptions } from '../../core/input/axis';
import type { TargetPose } from '../../core/targetPose';

import { readTargetRotation } from '../readTargetPose';

import { resolveQuat } from '../resolve/resolveQuat';
import { resolveVec3, resolveVector3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

/** `PanTiltAim` relative to an optional `Object3D` or ref's rotation. */
export class PanTiltAimThree extends PanTiltAim<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();
  private readonly scratchRotation = quat.create();
  private readonly scratchPoint = vec3.create();

  override setFromRotation(rotation: Quaternion | Quat, options?: EaseOptions): void {
    super.setFromRotation(resolveQuat(this.scratchRotation, rotation), options);
  }

  override lookAt(point: Vector3Like, options?: EaseOptions): void {
    super.lookAt(resolveVec3(this.scratchPoint, point), options);
  }

  override forward<V extends Vector3 | Vec3>(out: V, flatten = false): V {
    if (out instanceof Vector3) resolveVector3(out, super.forward(this.scratchPoint, flatten));
    else super.forward(out, flatten);
    return out;
  }

  protected override readTarget(): TargetPose {
    this.pose.hasRotation = readTargetRotation(this.pose.rotation, this.target, this.targetSlot);
    return this.pose;
  }
}
