import type { CameraState } from '../cameraState';
import type { TargetPose } from '../targetPose';

import type { DampingConstant } from '../damping/damping';

import * as followZoom from './followZoom';
import type { FollowZoomParams } from './followZoom';

export type FollowZoomOptions = Partial<FollowZoomParams>;

/** Keeps the target the same size on screen by changing the field of view. Layers override `readTarget`. */
export class FollowZoomExtension<T = TargetPose | null> implements FollowZoomParams {
  declare width: number;
  declare damping: DampingConstant;
  declare fovRange: [number, number];
  declare aspect: number;

  target: T;
  readonly state = followZoom.createState();
  readonly applyAfter = 'body';

  constructor(target: T, options?: FollowZoomOptions) {
    this.target = target;
    Object.assign(this, followZoom.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): void =>
    followZoom.update(out, this.state, this, this.readTarget()?.position ?? null, dt, justActivated);

  /** This frame's target pose, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
