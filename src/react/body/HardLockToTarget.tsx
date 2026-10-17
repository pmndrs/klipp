import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as hardLockToTarget from '../../core/body/hardLockToTarget';
import type { HardLockToTargetOptions } from '../../core/body/HardLockToTargetBody';

import { HardLockToTargetBodyThree } from '../../three/body/HardLockToTargetBodyThree';
import type { Target } from '../../three/resolve/Target';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type HardLockToTargetProps = HardLockToTargetOptions & {
  /** Target position to follow. Unresolved targets are ignored. */
  target?: Target;
  ref?: Ref<HardLockToTargetBodyThree>;
};

/** Moves the camera to a target's position, optionally with damping. */
export function HardLockToTarget({ target, ref, ...settings }: HardLockToTargetProps) {
  const camera = useVirtualCamera();
  const params = hardLockToTarget.createParams(settings);
  const [body] = useState(() => new HardLockToTargetBodyThree(target, params));
  body.target = target;
  Object.assign(body, params);

  useImperativeHandle(ref, () => body, [body]);
  useInvalidateOnRender();
  useEffect(() => camera.setBody(body), [camera, body]);

  return null;
}
