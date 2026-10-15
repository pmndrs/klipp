import type { CameraState } from '../cameraState';
import type { TargetPose } from '../targetPose';

import type { DampingConstant } from '../damping/damping';

import * as hardLockToTarget from './hardLockToTarget';
import type { HardLockToTargetParams } from './hardLockToTarget';

export type HardLockToTargetOptions = Partial<HardLockToTargetParams>;

/** Locks the camera position to a target. Layers override `readTarget` to read their own targets. */
export class HardLockToTargetBody<T = TargetPose | null> implements HardLockToTargetParams {
  target: T;
  declare damping: DampingConstant;
  declare maxSpeed: number;

  readonly state = hardLockToTarget.createState();

  constructor(target: T, options?: HardLockToTargetOptions) {
    this.target = target;
    Object.assign(this, hardLockToTarget.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): void => {
    hardLockToTarget.update(out, this.state, this, this.readTarget()?.position ?? null, dt, justActivated);
  };

  primeFrom = (): void => hardLockToTarget.prime(this.state);

  /** This frame's target pose, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
