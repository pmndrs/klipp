import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import type { Target } from '../../three/resolve/Target';
import { useVirtualCamera } from '../VirtualCameraContext';
import {
  RotateWithFollowTargetAimThree,
  type RotateWithFollowTargetOptions,
} from '../../three/aim/RotateWithFollowTargetAimThree';
import * as rotateWithFollowTarget from '../../core/aim/rotateWithFollowTarget';

export type RotateWithFollowTargetProps = RotateWithFollowTargetOptions & {
  /** Target rotation to copy. Unresolved targets are ignored. */
  target?: Target;
  ref?: Ref<RotateWithFollowTargetAimThree>;
};

/** Thin wrapper around `RotateWithFollowTargetAimThree`. */
export function RotateWithFollowTarget({ target, ref, ...settings }: RotateWithFollowTargetProps) {
  const camera = useVirtualCamera();
  const params = rotateWithFollowTarget.createParams(settings);
  const [aim] = useState(() => new RotateWithFollowTargetAimThree(target, params));
  aim.target = target;
  Object.assign(aim, params);

  useImperativeHandle(ref, () => aim, [aim]);
  useEffect(() => camera.setAim(aim), [camera, aim]);

  return null;
}
