import { useFrame } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useMemo, useState, type Ref } from 'react';

import * as splineDolly from '../../core/body/splineDolly';
import { SplineDollyBody, type SplineDollyOptions } from '../../core/body/SplineDollyBody';

import { SplineHelperThree } from '../../three/body/SplineHelperThree';
import { createSpline, type SplineSource } from '../../three/createSpline';
import { resolveVec3, type Vector3Like } from '../../three/resolve/resolveVector3';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type SplineDollyProps = Omit<SplineDollyOptions, 'spline' | 'splineOffset'> & {
  /** The path to ride. Read again when this prop changes, not when its points move. */
  spline?: SplineSource | null;
  /** Whether a path given as points loops back to the first one. */
  closed?: boolean;
  /** Offset from the path: x to the side, y up, z along it. */
  splineOffset?: Vector3Like;
  /** Draws the path, its knots and the camera's point on it. */
  debug?: boolean;
  ref?: Ref<SplineDollyBody>;
};

/** Moves the camera along a path, to `position`. */
export function SplineDolly({
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
  const [body] = useState(() => new SplineDollyBody(params));
  Object.assign(body, params);
  resolveVec3(body.splineOffset, splineOffset ?? defaultSplineOffset);

  useImperativeHandle(ref, () => body, [body]);
  useInvalidateOnRender();
  useEffect(() => camera.setBody(body), [camera, body]);

  return debug ? <SplineDebug body={body} /> : null;
}

function SplineDebug({ body }: { body: SplineDollyBody }) {
  const [helper] = useState(() => new SplineHelperThree());
  useEffect(() => () => helper.dispose(), [helper]);
  useFrame(() => helper.sync(body));
  return <primitive object={helper} />;
}
