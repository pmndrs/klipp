import { useFrame } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useMemo, useState, type Ref } from 'react';

import * as splineDolly from '../../core/body/splineDolly';

import { SplineDollyBodyThree, type SplineDollyThreeOptions } from '../../three/body/SplineDollyBodyThree';
import { SplineHelperThree } from '../../three/body/SplineHelperThree';
import { createSpline, type SplineSource } from '../../three/createSpline';
import { resolveVec3 } from '../../three/resolve/resolveVector3';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type SplineDollyProps = Omit<SplineDollyThreeOptions, 'spline'> & {
  /** The path to ride. Read again when this prop changes, not when its points move. */
  spline?: SplineSource | null;
  /** Draws the path, its knots and the camera's point on it. */
  debug?: boolean;
  ref?: Ref<SplineDollyBodyThree>;
};

/** Moves the camera along a path, to `position` or by itself. */
export function SplineDolly({
  target,
  spline: source,
  closed = false,
  splineOffset,
  debug = false,
  ref,
  ...settings
}: SplineDollyProps) {
  const camera = useVirtualCamera();
  const path = useMemo(() => (source ? createSpline(source, closed) : null), [source, closed]);
  const { splineOffset: defaultSplineOffset, ...params } = splineDolly.createParams({ ...settings, spline: path });
  const [body] = useState(() => new SplineDollyBodyThree({ ...params, target }));
  body.target = target;
  Object.assign(body, params);
  resolveVec3(body.splineOffset, splineOffset ?? defaultSplineOffset);

  useImperativeHandle(ref, () => body, [body]);
  useInvalidateOnRender();
  useEffect(() => camera.setBody(body), [camera, body]);

  return debug ? <SplineDebug body={body} /> : null;
}

function SplineDebug({ body }: { body: SplineDollyBodyThree }) {
  const [helper] = useState(() => new SplineHelperThree());
  useEffect(() => () => helper.dispose(), [helper]);
  useFrame(() => helper.sync(body));
  return <primitive object={helper} />;
}
