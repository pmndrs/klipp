import type { Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import type { Spline, SplinePositionUnits } from '../spline';
import type { TargetPose } from '../targetPose';

import type { DampingConstant } from '../damping/damping';

import * as splineDolly from './splineDolly';
import type { SplineAutomaticDolly, SplineDollyParams } from './splineDolly';

export type SplineDollyOptions<T = TargetPose | null> = Partial<SplineDollyParams> & {
  /** The target a `nearestPointToTarget` dolly keeps up with. */
  target?: T;
};

/** Moves the camera along a path, to `position` or by itself. */
export class SplineDollyBody<T = TargetPose | null> implements SplineDollyParams {
  target: T;
  declare spline: Spline | null;
  declare position: number;
  declare positionUnits: SplinePositionUnits;
  declare splineOffset: Vec3;
  declare damping: DampingConstant;
  declare automaticDolly: SplineAutomaticDolly | null;

  readonly state = splineDolly.createState();

  constructor({ target, ...options }: SplineDollyOptions<T> = {}) {
    this.target = (target ?? null) as T;
    Object.assign(this, splineDolly.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): boolean =>
    splineDolly.update(out, this.state, this, this.readTarget()?.position ?? null, dt, justActivated);

  primeFrom = (position: Vec3): void => splineDolly.prime(this.state, this, position);

  onActivated = (): void => splineDolly.startOver(this.state, this);

  /** This frame's target pose, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
