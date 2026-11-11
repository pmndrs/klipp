import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as hardLookAt from '../../core/aim/hardLookAt';
import type { HardLookAtOptions } from '../../core/aim/HardLookAtAim';

import { HardLookAtAimThree } from '../../three/aim/HardLookAtAimThree';
import type { Target } from '../../three/resolve/Target';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type HardLookAtProps = HardLookAtOptions & {
  /** Target to look at. Unresolved targets are ignored. */
  target?: Target;
  ref?: Ref<HardLookAtAimThree>;
};

/** Rotates the camera to look straight at a target. */
export function HardLookAt({ target, ref, ...settings }: HardLookAtProps) {
  const camera = useVirtualCamera();
  const params = hardLookAt.createParams(settings);
  const [aim] = useState(() => new HardLookAtAimThree(target, params));
  aim.target = target;
  Object.assign(aim, params);

  useImperativeHandle(ref, () => aim, [aim]);
  useInvalidateOnRender();
  useEffect(() => camera.setAim(aim), [camera, aim]);

  return null;
}
