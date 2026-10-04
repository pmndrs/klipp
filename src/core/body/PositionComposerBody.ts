import type { Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import type { TargetPose } from '../TargetPose';

import type { DampingConstant } from '../damping/damping';

import * as positionComposer from './positionComposer';
import type { PositionComposerParams } from './positionComposer';

/** Positions the camera using depth and screen-space composition. Layers override `readTarget`. */
export class PositionComposerBody<T = TargetPose | null> implements PositionComposerParams {
  target: T;
  declare cameraDistance: number;
  declare screenPosition: [number, number];
  declare aspect: number;
  declare deadZone: [number, number];
  declare damping: DampingConstant;
  declare hardLimit: [number, number];
  declare depthDeadZone: number;
  declare maxSpeed: number;
  declare lookaheadTime: number;
  declare lookaheadSmoothing: number;
  declare lookaheadIgnoreY: boolean;

  readonly state = positionComposer.createState();
  private lastTarget: T | undefined = undefined;

  constructor(target: T, options?: Partial<PositionComposerParams>) {
    this.target = target;
    Object.assign(this, positionComposer.createParams(options));
  }

  primeFrom = (position: Vec3): void => positionComposer.prime(this.state, this, position);

  update = (out: CameraState, dt: number, justActivated: boolean): void => {
    const pose = this.readTarget();
    if (pose) {
      if (this.target !== this.lastTarget) positionComposer.retarget(this.state);
      this.lastTarget = this.target;
    }
    positionComposer.update(out, this.state, this, pose, dt, justActivated);
  };

  /** This frame's target pose with its extent, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
