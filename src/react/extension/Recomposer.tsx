import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as recomposer from '../../core/extension/recomposer';
import { RecomposerExtension, type RecomposerOptions } from '../../core/extension/RecomposerExtension';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type RecomposerProps = RecomposerOptions & { ref?: Ref<RecomposerExtension> };

/** Turns, rolls and zooms the finished shot. */
export function Recomposer({ ref, ...settings }: RecomposerProps) {
  const camera = useVirtualCamera();
  const params = recomposer.createParams(settings);
  const [extension] = useState(() => new RecomposerExtension(params));
  Object.assign(extension, params);

  useImperativeHandle(ref, () => extension, [extension]);
  useInvalidateOnRender();
  useEffect(() => camera.addExtension(extension), [camera, extension]);

  return null;
}
