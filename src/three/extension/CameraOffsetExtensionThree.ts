import { CameraOffsetExtension, type CameraOffsetOptions } from '../../core/extension/CameraOffsetExtension';

import { optionalVec3, type Vector3Like } from '../resolve/resolveVector3';

export type CameraOffsetThreeOptions = Omit<CameraOffsetOptions, 'offset'> & {
  /** How far to move the camera in its own space: x right, y up, z back. */
  offset?: Vector3Like;
};

/** `CameraOffsetExtension` taking a three.js vector in its options. */
export class CameraOffsetExtensionThree extends CameraOffsetExtension {
  constructor({ offset, ...options }: CameraOffsetThreeOptions = {}) {
    super({ ...options, offset: optionalVec3(offset) });
  }
}
