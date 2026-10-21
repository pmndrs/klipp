import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as cameraOffset from '../../core/extension/cameraOffset';

import {
  CameraOffsetExtensionThree,
  type CameraOffsetThreeOptions,
} from '../../three/extension/CameraOffsetExtensionThree';
import { resolveVec3 } from '../../three/resolve/resolveVector3';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type CameraOffsetProps = Omit<CameraOffsetThreeOptions, 'orthographic'> & {
  ref?: Ref<CameraOffsetExtensionThree>;
};

/** Moves the camera in its own space after the Body and Aim. */
export function CameraOffset({ offset, ref, ...settings }: CameraOffsetProps) {
  const camera = useVirtualCamera();
  const { offset: defaultOffset, ...params } = cameraOffset.createParams({
    ...settings,
    orthographic: camera.klipp?.orthographic ?? false,
  });
  const [extension] = useState(() => new CameraOffsetExtensionThree(params));
  Object.assign(extension, params);
  resolveVec3(extension.offset, offset ?? defaultOffset);

  useImperativeHandle(ref, () => extension, [extension]);
  useInvalidateOnRender();
  useEffect(() => camera.addExtension(extension), [camera, extension]);

  return null;
}
