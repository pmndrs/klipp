import { describe, expect, it, vi } from 'vitest';

import * as spline from '../../../src/core/spline';
import { SplineDollyBody } from '../../../src/core/body/SplineDollyBody';

import { SplineHelperThree } from '../../../src/three/body/SplineHelperThree';

describe('SplineHelperThree', () => {
  it('draws a new path into new geometry and frees the old one', () => {
    const helper = new SplineHelperThree();
    const body = new SplineDollyBody({
      spline: spline.create([
        [0, 0, 0],
        [10, 0, 0],
      ]),
    });
    helper.sync(body);
    const first = helper.curve.geometry;
    const dispose = vi.spyOn(first, 'dispose');

    body.spline = spline.create([
      [0, 0, 0],
      [0, 5, 0],
      [5, 5, 0],
    ]);
    helper.sync(body);
    expect(dispose).toHaveBeenCalledOnce();
    expect(helper.curve.geometry).not.toBe(first);
    expect(helper.knots.geometry.getAttribute('position').count).toBe(3);
  });
});
