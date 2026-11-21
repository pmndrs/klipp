import type { Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as splineRoll from '../../../src/core/extension/splineRoll';
import * as spline from '../../../src/core/spline';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

const line = spline.create([
  [0, 0, 0],
  [10, 0, 0],
]);
const square = spline.create(
  [
    [0, 0, 0],
    [10, 0, 0],
    [10, 0, 10],
    [0, 0, 10],
  ],
  { closed: true },
);

const params = (points: splineRoll.SplineRollPoint[], easing = 0) => splineRoll.createParams({ points, easing });

describe('splineRoll.rollAt', () => {
  it('is 0 without points, and the one roll everywhere with one point', () => {
    expect(splineRoll.rollAt(params([]), line, 'distance', 5)).toBe(0);
    for (const distance of [0, 3, 10]) {
      expect(splineRoll.rollAt(params([{ position: 4, roll: 20 }]), line, 'distance', distance)).toBe(20);
    }
  });

  it('turns at an even pace between points placed anywhere, in the dolly units, holding past the ends', () => {
    const points = params([
      { position: 0.2, roll: 0 },
      { position: 0.6, roll: 40 },
    ]);
    expect(splineRoll.rollAt(points, line, 'normalized', 4)).toBeCloseTo(20, 9);
    expect(splineRoll.rollAt(points, line, 'normalized', 1)).toBe(0);
    expect(splineRoll.rollAt(points, line, 'normalized', 9)).toBe(40);
  });

  it('holds the roll at each point for the first and last third of the way at full easing', () => {
    const points = params(
      [
        { position: 0, roll: 0 },
        { position: 9, roll: 30 },
      ],
      1,
    );
    expect(splineRoll.rollAt(points, line, 'distance', 2)).toBe(0);
    expect(splineRoll.rollAt(points, line, 'distance', 4.5)).toBeCloseTo(15, 9);
    expect(splineRoll.rollAt(points, line, 'distance', 7)).toBe(30);
  });

  it('goes round a closed path from the last point to the first, across the start', () => {
    const points = params([
      { position: 0.1, roll: 10 },
      { position: 0.9, roll: 30 },
    ]);
    expect(splineRoll.rollAt(points, square, 'normalized', 0)).toBeCloseTo(20, 9);
    expect(splineRoll.rollAt(points, square, 'normalized', square.length * 0.3)).toBeCloseTo(15, 9);
  });
});

describe('splineRoll.update', () => {
  it('turns referenceUp around the direction of travel, to the right, from the camera’s own up', () => {
    const out = cameraState.create();
    splineRoll.update(out, params([{ position: 0, roll: 90 }]), line, 'distance', 5, null);
    expectVec3(out.referenceUp, [0, 0, 1]);

    const tilted = cameraState.create();
    tilted.referenceUp = [0, 0, -1];
    splineRoll.update(tilted, params([{ position: 0, roll: 90 }]), line, 'distance', 5, null);
    expectVec3(tilted.referenceUp, [0, 1, 0]);
  });

  it('leans the dolly’s splineOffset with the path', () => {
    const out = cameraState.create();
    out.position = [5, 1, 0];
    splineRoll.update(out, params([{ position: 0, roll: 90 }]), line, 'distance', 5, [0, 1, 0]);
    expectVec3(out.position, [5, 0, 1]);
  });

  it('leaves the camera alone where the roll is 0', () => {
    const out = cameraState.create();
    out.position = [5, 1, 0];
    splineRoll.update(out, params([]), line, 'distance', 5, [0, 1, 0]);
    expectVec3(out.referenceUp, [0, 1, 0]);
    expectVec3(out.position, [5, 1, 0]);
  });
});
