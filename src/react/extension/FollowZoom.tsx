import { useThree } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as followZoom from '../../core/extension/followZoom';
import type { FollowZoomOptions } from '../../core/extension/FollowZoomExtension';

import { FollowZoomExtensionThree } from '../../three/extension/FollowZoomExtensionThree';
import type { Target } from '../../three/resolve/Target';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type FollowZoomProps = Omit<FollowZoomOptions, 'aspect'> & {
  /** Target to keep the same size on screen. Unresolved targets are ignored. */
  target?: Target;
  ref?: Ref<FollowZoomExtensionThree>;
};

/** Keeps a target the same size on screen by changing the field of view. */
export function FollowZoom({ target, ref, ...settings }: FollowZoomProps) {
  const camera = useVirtualCamera();
  const aspect = useThree((state) => state.viewport.aspect);
  const params = followZoom.createParams({ ...settings, aspect });
  const [extension] = useState(() => new FollowZoomExtensionThree(target, params));
  extension.target = target;
  Object.assign(extension, params);

  useImperativeHandle(ref, () => extension, [extension]);
  useInvalidateOnRender();
  useEffect(() => camera.addExtension(extension), [camera, extension]);

  return null;
}
