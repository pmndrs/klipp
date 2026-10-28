import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as splineDollyLookAtTargets from '../../core/aim/splineDollyLookAtTargets';
import type { SplineDollyLookAtTargetsOptions } from '../../core/aim/SplineDollyLookAtTargetsAim';

import { SplineDollyLookAtTargetsAimThree } from '../../three/aim/SplineDollyLookAtTargetsAimThree';
import type { Target } from '../../three/resolve/Target';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type SplineDollyLookAtTargetsProps = SplineDollyLookAtTargetsOptions<Target> & {
  ref?: Ref<SplineDollyLookAtTargetsAimThree>;
};

/** Looks along the path of the camera's `<Body.SplineDolly>`, or at the targets placed along it. */
export function SplineDollyLookAtTargets({ ref, ...settings }: SplineDollyLookAtTargetsProps) {
  const camera = useVirtualCamera();
  const params = splineDollyLookAtTargets.createParams<Target>(settings);
  const [aim] = useState(() => new SplineDollyLookAtTargetsAimThree(params));
  Object.assign(aim, params);

  useImperativeHandle(ref, () => aim, [aim]);
  useInvalidateOnRender();
  useEffect(() => camera.setAim(aim), [camera, aim]);

  return null;
}
