import type { CameraState } from '../cameraState';
import type { TargetPose } from '../targetPose';

import * as hardLookAt from './hardLookAt';
import type { HardLookAtParams } from './hardLookAt';

export type HardLookAtOptions = Partial<HardLookAtParams>;

/** Rotates so the target is dead-center. Layers override `readTarget` to read their own targets. */
export class HardLookAtAim<T = TargetPose | null> implements HardLookAtParams {
  target: T;
  declare lookAt: 'target' | 'body';

  constructor(target: T, options?: HardLookAtOptions) {
    this.target = target;
    Object.assign(this, hardLookAt.createParams(options));
  }

  update = (out: CameraState): void => {
    if (this.lookAt === 'body') {
      if (out.hasTarget) hardLookAt.update(out, out.target);
      return;
    }
    const pose = this.readTarget();
    if (pose) hardLookAt.update(out, pose.position);
  };

  /** This frame's target pose, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
