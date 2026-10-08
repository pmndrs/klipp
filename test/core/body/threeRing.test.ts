import { vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as threeRing from '../../../src/core/body/threeRing';
import type { Orbits } from '../../../src/core/body/threeRing';

const rings = (): Orbits => ({
  top: { height: 5, radius: 2 },
  center: { height: 2.25, radius: 4 },
  bottom: { height: 0.1, radius: 2.5 },
});

const at = (state: threeRing.ThreeRingState, settings: Orbits, t: number, curvature = 0.5): Vec3 =>
  threeRing.point(vec3.create(), state, settings, curvature, t);

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

describe('threeRing.point', () => {
  it('passes through the bottom, center and top ring', () => {
    const state = threeRing.createState();
    const settings = rings();
    expectVec3(at(state, settings, 0), [0, 0.1, 2.5]);
    expectVec3(at(state, settings, 0.5), [0, 2.25, 4]);
    expectVec3(at(state, settings, 1), [0, 5, 2]);
  });

  it('clamps t to the outer rings', () => {
    const state = threeRing.createState();
    const settings = rings();
    expectVec3(at(state, settings, -1), [0, 0.1, 2.5]);
    expectVec3(at(state, settings, 2), [0, 5, 2]);
  });

  it('turns smoothly through the center ring', () => {
    const state = threeRing.createState();
    const settings = rings();
    const h = 1e-6;
    const before = vec3.subtract(vec3.create(), at(state, settings, 0.5), at(state, settings, 0.5 - h));
    const after = vec3.subtract(vec3.create(), at(state, settings, 0.5 + h), at(state, settings, 0.5));
    expect(after[1] / h).toBeCloseTo(before[1] / h, 3);
    expect(after[2] / h).toBeCloseTo(before[2] / h, 3);
  });

  it('bends between the rings with the curvature, keeping the rings in place', () => {
    const state = threeRing.createState();
    const settings = rings();
    const loose = at(state, settings, 0.25, 0);
    const taut = at(state, settings, 0.25, 1);
    expect(vec3.distance(loose, taut)).toBeGreaterThan(1e-3);
    expectVec3(at(state, settings, 0, 1), [0, 0.1, 2.5]);
    expectVec3(at(state, settings, 0.5, 0), [0, 2.25, 4]);
  });

  it('limits the curvature to 0..1', () => {
    const state = threeRing.createState();
    const settings = rings();
    expectVec3(at(state, settings, 0.25, 3), at(threeRing.createState(), settings, 0.25, 1));
    expectVec3(at(state, settings, 0.25, -2), at(threeRing.createState(), settings, 0.25, 0));
  });

  it('rebuilds after the rings change', () => {
    const state = threeRing.createState();
    const settings = rings();
    at(state, settings, 1);
    settings.top.height = 8;
    expectVec3(at(state, settings, 1), [0, 8, 2]);
  });
});
