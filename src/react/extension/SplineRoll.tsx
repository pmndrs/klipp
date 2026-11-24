import { useFrame } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as splineRoll from '../../core/extension/splineRoll';
import { SplineRollExtension, type SplineRollOptions } from '../../core/extension/SplineRollExtension';

import { SplineRollHelperThree } from '../../three/extension/SplineRollHelperThree';

import { useKlipp } from '../KlippContext';
import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type SplineRollProps = SplineRollOptions & {
  /** Draws the up direction along the path, banked by the roll. */
  debug?: boolean;
  ref?: Ref<SplineRollExtension>;
};

/** Banks the path of the camera's `<Body.SplineDolly>` at points along it. */
export function SplineRoll({ debug = false, ref, ...settings }: SplineRollProps) {
  const camera = useVirtualCamera();
  const params = splineRoll.createParams(settings);
  const [extension] = useState(() => new SplineRollExtension(params));
  Object.assign(extension, params);

  useImperativeHandle(ref, () => extension, [extension]);
  useInvalidateOnRender();
  useEffect(() => camera.addExtension(extension), [camera, extension]);

  return debug ? <SplineRollDebug extension={extension} /> : null;
}

function SplineRollDebug({ extension }: { extension: SplineRollExtension }) {
  const klipp = useKlipp();
  const [helper] = useState(() => new SplineRollHelperThree());
  useEffect(() => () => helper.dispose(), [helper]);
  useFrame(() => helper.sync(extension, klipp.up));
  return <primitive object={helper} />;
}
