import { quat, vec3, type Quat } from 'math';
import type { Quaternion } from 'three';

import * as panTilt from '../../core/aim/panTilt';
import * as targetPose from '../../core/targetPose';
import { PanTiltAim } from '../../core/aim/PanTiltAim';
import type { TargetPose } from '../../core/targetPose';

import { readTargetRotation } from '../readTargetPose';

import { resolveQuat } from '../resolve/resolveQuat';
import { resolveVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';

/** `PanTiltAim` relative to an optional `Object3D` or ref's rotation. */
export class PanTiltAimThree extends PanTiltAim<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly pose = targetPose.create();
  private readonly scratchRotation = quat.create();
  private readonly scratchUp = vec3.create();

  override setFromRotation = (rotation: Quaternion | Quat, referenceUp?: Vector3Like): void => {
    const up = referenceUp === undefined ? this.state.referenceUp : resolveVec3(this.scratchUp, referenceUp);
    panTilt.setFromRotation(this.state, this.targetRotation(), resolveQuat(this.scratchRotation, rotation), up);
  };

  protected override readTarget(): TargetPose {
    this.pose.hasRotation = readTargetRotation(this.pose.rotation, this.target, this.targetSlot);
    return this.pose;
  }
}
