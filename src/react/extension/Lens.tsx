import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as lens from '../../core/extension/lens';
import { LensExtension, type LensOptions } from '../../core/extension/LensExtension';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type LensProps = LensOptions & { ref?: Ref<LensExtension> };

/** Animates the camera lens without forcing a React re-render. */
export function Lens({ ref, ...settings }: LensProps) {
  const camera = useVirtualCamera();
  const params = lens.createParams(settings);
  const [extension] = useState(() => new LensExtension(params));
  Object.assign(extension, params);

  useImperativeHandle(ref, () => extension, [extension]);
  useInvalidateOnRender();
  useEffect(() => camera.addExtension(extension), [camera, extension]);

  return null;
}
