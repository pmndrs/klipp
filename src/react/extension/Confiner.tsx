import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as confiner from '../../core/extension/confiner';
import type { ConfinerOptions } from '../../core/extension/ConfinerExtension';

import { ConfinerExtensionThree, type ConfinerBoundsThree } from '../../three/extension/ConfinerExtensionThree';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type ConfinerProps = ConfinerOptions & {
  /** The box or sphere to keep the camera in: a three.js `Box3` or `Sphere`, or core bounds. */
  bounds?: ConfinerBoundsThree;
  ref?: Ref<ConfinerExtensionThree>;
};

/** Keeps the camera inside a box or a sphere. */
export function Confiner({ bounds = null, ref, ...settings }: ConfinerProps) {
  const camera = useVirtualCamera();
  const params = confiner.createParams(settings);
  const [extension] = useState(() => new ConfinerExtensionThree(bounds, params));
  extension.bounds = bounds;
  Object.assign(extension, params);

  useImperativeHandle(ref, () => extension, [extension]);
  useInvalidateOnRender();
  useEffect(() => camera.addExtension(extension), [camera, extension]);

  return null;
}
