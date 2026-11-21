import type { Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import type { BodyPiece } from '../VirtualCamera';

import type { SplineDollyLike } from '../aim/SplineDollyLookAtTargetsAim';

import * as splineRoll from './splineRoll';
import type { SplineRollParams, SplineRollPoint } from './splineRoll';

export type SplineRollOptions = Partial<SplineRollParams>;

const isDolly = (body: BodyPiece | null): body is BodyPiece & SplineDollyLike & { splineOffset?: Vec3 } =>
  body !== null && 'spline' in body && 'positionUnits' in body && 'state' in body;

/**
 * Banks the path of the camera's Body, a `SplineDollyBody` or any `SplineDollyLike`: turns the camera's up around the
 * direction of travel, before the Aim frames with it.
 */
export class SplineRollExtension implements SplineRollParams {
  declare points: SplineRollPoint[];
  declare easing: number;
  readonly applyAfter = 'body';
  /** The camera's Body, kept up to date by the camera. */
  cameraBody: BodyPiece | null = null;

  constructor(options?: SplineRollOptions) {
    Object.assign(this, splineRoll.createParams(options));
  }

  update = (out: CameraState): void => {
    const dolly = this.cameraBody;
    if (!isDolly(dolly) || !dolly.spline) return;
    splineRoll.update(out, this, dolly.spline, dolly.positionUnits, dolly.state.distance, dolly.splineOffset ?? null);
  };
}
