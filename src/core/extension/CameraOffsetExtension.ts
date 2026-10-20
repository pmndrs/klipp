import type { Vec3 } from 'math';

import type { CameraState } from '../cameraState';

import * as cameraOffset from './cameraOffset';
import type { CameraOffsetParams } from './cameraOffset';

export type CameraOffsetOptions = Partial<CameraOffsetParams>;

/** Moves the camera in its own space after the Body and Aim, optionally keeping the look-at target in place. */
export class CameraOffsetExtension implements CameraOffsetParams {
  declare offset: Vec3;
  declare preserveComposition: boolean;

  constructor(options?: CameraOffsetOptions) {
    Object.assign(this, cameraOffset.createParams(options));
  }

  update = (out: CameraState): void => cameraOffset.update(out, this);
}
