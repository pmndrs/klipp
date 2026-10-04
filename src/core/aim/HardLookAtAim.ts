import type { CameraState } from '../CameraState';
import type { TargetPose } from '../TargetPose';
import * as hardLookAt from './hardLookAt';

/** Rotates so the target is dead-center. Layers override `readTarget` to read their own targets. */
export class HardLookAtAim<T = TargetPose | null> {
  target: T;

  constructor(target: T) {
    this.target = target;
  }

  update = (out: CameraState): void => {
    const pose = this.readTarget();
    if (pose) hardLookAt.update(out, pose.position);
  };

  /** This frame's target pose, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
