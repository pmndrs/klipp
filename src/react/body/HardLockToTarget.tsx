import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import type { Target } from '../../three/resolve/Target.js';
import { useVirtualCamera } from '../VirtualCameraContext.js';
import { HardLockToTargetBodyThree, type HardLockToTargetOptions } from '../../three/body/HardLockToTargetBodyThree.js';
import * as hardLockToTarget from '../../core/body/hardLockToTarget.js';

export type HardLockToTargetProps = HardLockToTargetOptions & {
  /** Target position to follow. Unresolved targets are ignored. */
  target?: Target;
  ref?: Ref<HardLockToTargetBodyThree>;
};

/** Simple body that locks the camera to a target position, optionally with damping. */
export function HardLockToTarget({ target, ref, ...settings }: HardLockToTargetProps) {
  const camera = useVirtualCamera();
  const params = hardLockToTarget.createParams(settings);
  const [body] = useState(() => new HardLockToTargetBodyThree(target, params));
  body.target = target;
  Object.assign(body, params);

  useImperativeHandle(ref, () => body, [body]);
  useEffect(() => camera.setBody(body), [camera, body]);

  return null;
}
