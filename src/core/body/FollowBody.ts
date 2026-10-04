import type { Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import type { TargetPose } from '../TargetPose';

import type { DampingConstant } from '../damping/damping';

import * as follow from './follow';
import type { BindingMode } from './BindingModes';
import type { FollowParams } from './follow';

export type FollowOptions = Partial<FollowParams>;

/** Follows a target with an offset rotated according to `bindingMode`. Layers override `readTarget`. */
export class FollowBody<T = TargetPose | null> implements FollowParams {
  target: T;
  declare offset: Vec3;
  declare damping: DampingConstant;
  declare bindingMode: BindingMode;
  declare maxSpeed: number;

  readonly state = follow.createState();
  private lastTarget: T | undefined = undefined;

  constructor(target: T, options?: FollowOptions) {
    this.target = target;
    Object.assign(this, follow.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): void => {
    if (this.target !== this.lastTarget) {
      this.lastTarget = this.target;
      this.state.assigned = false;
    }
    follow.update(out, this.state, this, this.readTarget(), dt, justActivated);
  };

  primeFrom = (position: Vec3): void => follow.prime(this.state, this, position);

  /** This frame's target pose, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
