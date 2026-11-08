import { vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as confiner from '../../../src/core/extension/confiner';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

const box: confiner.ConfinerBounds = [-2, -2, -2, 2, 2, 2];

describe('confiner.confineStep', () => {
  it('moves freely away from the edges, and stops at an edge without slowing', () => {
    const out = vec3.create();
    expectVec3(confiner.confineStep(out, box, [0, 0, 0], [1, -1, 0.5], 0.5), [1, -1, 0.5]);
    expectVec3(confiner.confineStep(out, box, [0, 0, 0], [5, 0, 0]), [2, 0, 0]);
  });

  it('covers a shrinking share of the way left within slowingDistance of an edge, and never crosses it', () => {
    const out = vec3.create();
    confiner.confineStep(out, box, [1, 0, 0], [2, 0, 0], 1);
    expect(out[0]).toBeCloseTo(2 - Math.exp(-1), 12);
    confiner.confineStep(out, box, [0, 0, 0], [0, -100, 0], 1);
    expect(out[1]).toBeGreaterThanOrEqual(-2);
    expect(out[1]).toBeCloseTo(-2, 9);
  });

  it('moves away from an edge without slowing, even from inside the zone', () => {
    const out = vec3.create();
    expectVec3(confiner.confineStep(out, box, [1.8, 0, 0], [1.2, 0, 0], 1), [1.2, 0, 0]);
  });

  it('slows the distance from the center of a sphere the same way', () => {
    const out = vec3.create();
    const sphere = { center: [0, 0, 0] as Vec3, radius: 2 };
    confiner.confineStep(out, sphere, [0, 1, 0], [0, 2, 0], 1);
    expectVec3(out, [0, 2 - Math.exp(-1), 0]);
  });

  it('lets an empty box or sphere go anywhere', () => {
    const out = vec3.create();
    expectVec3(confiner.confineStep(out, [1, 1, 1, -1, -1, -1], [0, 0, 0], [5, 5, 5], 1), [5, 5, 5]);
  });
});
