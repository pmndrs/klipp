import { CatmullRomCurve3 } from 'three';

import * as spline from '../core/spline';
import type { Spline } from '../core/spline';

import { resolveVec3, type Vector3Like } from './resolve/resolveVector3';

/** A path as a `CatmullRomCurve3` or as the points it runs through. */
export type SplineSource = CatmullRomCurve3 | readonly Vector3Like[];

/** A `Spline` through a curve's points, or through `points`, closed when `closed` is set. */
export function createSpline(source: SplineSource, closed = false): Spline {
  if (source instanceof CatmullRomCurve3) {
    if (source.curveType !== 'centripetal') {
      console.warn(`createSpline: a "${source.curveType}" CatmullRomCurve3 is followed as a centripetal one.`);
    }
    return spline.create(
      source.points.map(({ x, y, z }) => [x, y, z]),
      source.closed,
    );
  }
  return spline.create(
    source.map((point) => resolveVec3([0, 0, 0], point)),
    closed,
  );
}
