import { CatmullRomCurve3 } from 'three';

import * as spline from '../core/spline';
import type { Spline, SplineOptions } from '../core/spline';

import { resolveVec3, type Vector3Like } from './resolve/resolveVector3';

/** A path as a `CatmullRomCurve3` or as the points it runs through. */
export type SplineSource = CatmullRomCurve3 | readonly Vector3Like[];

/** A `Spline` through a curve's points, or through `points`. A curve brings its own `closed`. */
export function createSpline(source: SplineSource, options: SplineOptions = {}): Spline {
  if (source instanceof CatmullRomCurve3) {
    if (source.curveType !== 'centripetal') {
      console.warn(`createSpline: a "${source.curveType}" CatmullRomCurve3 is followed as a centripetal one.`);
    }
    return spline.create(
      source.points.map(({ x, y, z }) => [x, y, z]),
      { ...options, closed: source.closed },
    );
  }
  return spline.create(
    source.map((point) => resolveVec3([0, 0, 0], point)),
    options,
  );
}

/** `source` as a `Spline`: built from a curve or points, or as it is when it already is one. */
export function toSpline<S extends SplineSource | Spline | null | undefined>(
  source: S,
  options?: SplineOptions,
): Exclude<S, SplineSource> | Spline {
  return Array.isArray(source) || source instanceof CatmullRomCurve3
    ? createSpline(source, options)
    : (source as Exclude<S, SplineSource>);
}
