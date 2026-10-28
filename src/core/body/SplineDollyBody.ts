import type { Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import type { Spline, SplinePositionUnits } from '../spline';

import type { DampingConstant } from '../damping/damping';

import * as splineDolly from './splineDolly';
import type { SplineAutomaticDolly, SplineDollyParams } from './splineDolly';

export type SplineDollyOptions = Partial<SplineDollyParams>;

/** Moves the camera along a path, to `position` or by itself. */
export class SplineDollyBody implements SplineDollyParams {
  declare spline: Spline | null;
  declare position: number;
  declare positionUnits: SplinePositionUnits;
  declare splineOffset: Vec3;
  declare damping: DampingConstant;
  declare automaticDolly: SplineAutomaticDolly | null;

  readonly state = splineDolly.createState();

  constructor(options?: SplineDollyOptions) {
    Object.assign(this, splineDolly.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): void => {
    splineDolly.update(out, this.state, this, dt, justActivated);
  };

  primeFrom = (position: Vec3): void => splineDolly.prime(this.state, this, position);

  onActivated = (): void => splineDolly.startOver(this.state, this);
}
