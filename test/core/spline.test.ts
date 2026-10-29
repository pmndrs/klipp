import { vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as spline from '../../src/core/spline';

const expectPoint = (actual: Vec3, expected: Vec3, digits = 5) => {
  expect(actual[0]).toBeCloseTo(expected[0], digits);
  expect(actual[1]).toBeCloseTo(expected[1], digits);
  expect(actual[2]).toBeCloseTo(expected[2], digits);
};

const line = spline.create([
  [0, 0, 0],
  [1, 0, 0],
  [2, 0, 0],
  [3, 0, 0],
]);
const knots: Vec3[] = [
  [0, 0, 0],
  [2, 1, 0],
  [3, 0, 2],
  [5, -1, 2],
];
const open = spline.create(knots);
const closed = spline.create(knots, true);

const circleRadius = 2;
const circle = spline.create(
  Array.from({ length: 24 }, (_, i): Vec3 => {
    const angle = (i / 24) * Math.PI * 2;
    return [Math.cos(angle) * circleRadius, 0, Math.sin(angle) * circleRadius];
  }),
  true,
);

describe('spline.create', () => {
  it('counts a segment between each pair of knots, plus one back to the start when closed', () => {
    expect(open.segmentCount).toBe(3);
    expect(closed.segmentCount).toBe(4);
  });

  it('copies the knots, so changing the source later leaves the spline as built', () => {
    const source: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
    ];
    const built = spline.create(source);
    source[1][0] = 5;
    expect(built.knots[1]).toEqual([1, 0, 0]);
  });

  it('measures the length along the curve', () => {
    expect(line.length).toBeCloseTo(3, 6);
    expect(open.length).toBeCloseTo(7.05893, 2);
    expect(closed.length).toBeCloseTo(12.7177, 2);
    expect(circle.length).toBeCloseTo(2 * Math.PI * circleRadius, 2);
  });
});

describe('spline.pointAt', () => {
  it('moves evenly along evenly spaced knots on a line', () => {
    expectPoint(spline.pointAt([0, 0, 0], line, 0), [0, 0, 0]);
    expectPoint(spline.pointAt([0, 0, 0], line, 1.25), [1.25, 0, 0]);
    expectPoint(spline.pointAt([0, 0, 0], line, 3), [3, 0, 0]);
  });

  it('passes through every knot', () => {
    for (const s of [open, closed]) {
      knots.forEach((knot, i) => expectPoint(spline.pointAt([0, 0, 0], s, spline.toDistance(s, i, 'knot')), knot));
    }
  });

  it('draws the same curve as a centripetal CatmullRomCurve3 through the same points', () => {
    const at = (s: spline.Spline, knot: number) => spline.pointAt([0, 0, 0], s, spline.toDistance(s, knot, 'knot'));
    expectPoint(at(open, 0.25), [0.523924, 0.294786, -0.043766]);
    expectPoint(at(open, 1.5), [2.5, 0.633811, 1]);
    expectPoint(at(open, 2.75), [4.476076, -0.748979, 2.043766]);
    expectPoint(at(closed, 0.25), [0.239135, 0.274992, -0.113823]);
    expectPoint(at(closed, 2.75), [4.760865, -0.838831, 2.113823]);
    expectPoint(at(closed, 3.5), [2.5, -0.738734, 1]);
  });

  it('stays on a circle drawn through knots around it', () => {
    for (let distance = 0; distance < circle.length; distance += 0.37) {
      expect(vec3.length(spline.pointAt([0, 0, 0], circle, distance))).toBeCloseTo(circleRadius, 2);
    }
  });

  it('stops at the ends of an open spline and wraps around a closed one', () => {
    expectPoint(spline.pointAt([0, 0, 0], line, -1), [0, 0, 0]);
    expectPoint(spline.pointAt([0, 0, 0], line, 4), [3, 0, 0]);
    expectPoint(spline.pointAt([0, 0, 0], closed, closed.length + 1), spline.pointAt([0, 0, 0], closed, 1));
    expectPoint(spline.pointAt([0, 0, 0], closed, -1), spline.pointAt([0, 0, 0], closed, closed.length - 1));
  });

  it('stays at the only knot, or the origin without any', () => {
    expect(spline.pointAt([9, 9, 9], spline.create([[1, 2, 3]]), 5)).toEqual([1, 2, 3]);
    expect(spline.pointAt([9, 9, 9], spline.create([]), 5)).toEqual([0, 0, 0]);
  });
});

describe('spline.tangentAt', () => {
  it('points along a line', () => {
    expectPoint(spline.tangentAt([0, 0, 0], line, 1.7), [1, 0, 0]);
  });

  it('runs around a circle, square to its radius', () => {
    for (let distance = 0; distance < circle.length; distance += 0.37) {
      const point = spline.pointAt([0, 0, 0], circle, distance);
      const tangent = spline.tangentAt([0, 0, 0], circle, distance);
      expect(vec3.length(tangent)).toBeCloseTo(1, 6);
      expect(vec3.dot(tangent, vec3.normalize(point, point))).toBeCloseTo(0, 2);
    }
  });
});

describe('spline position units', () => {
  it('measures a knot position up to that knot along the curve', () => {
    expect(spline.toDistance(line, 2, 'knot')).toBeCloseTo(2, 6);
    expect(spline.toDistance(open, 3, 'knot')).toBeCloseTo(open.length, 9);
    expect(spline.toDistance(open, 0.5, 'normalized')).toBeCloseTo(open.length / 2, 9);
  });

  it('converts back from a distance to the same position', () => {
    for (const units of ['distance', 'normalized', 'knot'] as const) {
      for (const position of [0.1, 0.4, 0.9]) {
        const distance = spline.toDistance(open, position, units);
        expect(spline.fromDistance(open, distance, units)).toBeCloseTo(position, 9);
      }
    }
  });

  it('clamps an open spline and wraps a closed one', () => {
    expect(spline.standardize(open, 4.5, 'knot')).toBe(3);
    expect(spline.standardize(open, -0.5, 'normalized')).toBe(0);
    expect(spline.standardize(closed, 4.5, 'knot')).toBeCloseTo(0.5, 9);
    expect(spline.standardize(closed, -0.25, 'normalized')).toBeCloseTo(0.75, 9);
    expect(spline.standardize(closed, closed.length + 1, 'distance')).toBeCloseTo(1, 9);
  });

  it('ends at its length, 1, or its segment count', () => {
    expect(spline.maxPosition(open, 'distance')).toBe(open.length);
    expect(spline.maxPosition(open, 'normalized')).toBe(1);
    expect(spline.maxPosition(open, 'knot')).toBe(3);
  });
});

describe('spline.nearest', () => {
  it('finds the closest point on a line', () => {
    expect(spline.nearest(line, [1.3, 4, -2])).toBeCloseTo(1.3, 2);
    expect(spline.nearest(line, [-5, 1, 0])).toBe(0);
    expect(spline.nearest(line, [8, 1, 0])).toBeCloseTo(3, 9);
  });

  it('finds the closest point on a circle, also just before the seam of a closed spline', () => {
    for (const angle of [0.3, 2, 4.5, Math.PI * 2 - 0.05]) {
      const outside: Vec3 = [Math.cos(angle) * 5, 1, Math.sin(angle) * 5];
      const point = spline.pointAt([0, 0, 0], circle, spline.nearest(circle, outside));
      expect(Math.atan2(point[2], point[0])).toBeCloseTo(Math.atan2(outside[2], outside[0]), 2);
    }
  });
});

describe('spline.nearest with one sample a segment', () => {
  it('still narrows down on the nearest point', () => {
    const angle = 1.1;
    const outside: Vec3 = [Math.cos(angle) * 5, 0, Math.sin(angle) * 5];
    const point = spline.pointAt([0, 0, 0], circle, spline.nearest(circle, outside, 1, 6));
    expect(Math.atan2(point[2], point[0])).toBeCloseTo(angle, 2);
  });
});
