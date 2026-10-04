import type { Quat, Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import type { TargetPose } from '../TargetPose';

import type { DampingConstant } from '../damping/damping';

import * as rotationComposer from './rotationComposer';
import type { RotationComposerParams } from './rotationComposer';

/** Rotates the camera to place a target at `screenPosition`. Layers override `readTarget`. */
export class RotationComposerAim<T = TargetPose | null> implements RotationComposerParams {
  target: T;
  declare screenPosition: [number, number];
  declare aspect: number;
  declare deadZone: [number, number];
  declare damping: DampingConstant;
  declare maxSpeed: number;
  declare hardLimit: [number, number];
  declare targetOffset: Vec3;
  declare lookaheadTime: number;
  declare lookaheadSmoothing: number;
  declare lookaheadIgnoreY: boolean;

  readonly state = rotationComposer.createState();
  private lastTarget: T | undefined = undefined;

  constructor(target: T, options?: Partial<RotationComposerParams>) {
    this.target = target;
    Object.assign(this, rotationComposer.createParams(options));
  }

  primeFrom = (rotation: Quat): void => rotationComposer.prime(this.state, this, rotation);

  update = (out: CameraState, dt: number, justActivated: boolean): void => {
    const pose = this.readTarget();
    if (pose) {
      if (this.target !== this.lastTarget) rotationComposer.retarget(this.state);
      this.lastTarget = this.target;
    }
    rotationComposer.update(out, this.state, this, pose, dt, justActivated);
  };

  /** This frame's target pose with its extent, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
