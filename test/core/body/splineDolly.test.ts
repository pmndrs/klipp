import type { Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as splineDolly from '../../../src/core/body/splineDolly';
import * as cameraState from '../../../src/core/cameraState';
import * as spline from '../../../src/core/spline';
import type { SplineDollyParams } from '../../../src/core/body/splineDolly';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 6);
};

const line = spline.create([
  [0, 0, 0],
  [1, 0, 0],
  [2, 0, 0],
  [3, 0, 0],
  [4, 0, 0],
]);
const square = spline.create(
  [
    [0, 0, 0],
    [4, 0, 0],
    [4, 0, 4],
    [0, 0, 4],
  ],
  true,
);

function run(params: SplineDollyParams, frames = 1, dt = 1 / 60) {
  const out = cameraState.create();
  const state = splineDolly.createState();
  for (let i = 0; i < frames; i++) splineDolly.update(out, state, params, dt, i === 0);
  return { out, state };
}

describe('splineDolly.update', () => {
  it('leaves the camera where it is without a path', () => {
    const out = cameraState.create();
    out.position = [1, 2, 3];
    splineDolly.update(out, splineDolly.createState(), splineDolly.createParams(), 1 / 60, true);
    expect(out.position).toEqual([1, 2, 3]);
  });

  it('puts the camera at its position in any units', () => {
    expectVec3(run(splineDolly.createParams({ spline: line, position: 0.5 })).out.position, [2, 0, 0]);
    expectVec3(
      run(splineDolly.createParams({ spline: line, position: 3, positionUnits: 'knot' })).out.position,
      [3, 0, 0],
    );
    expectVec3(
      run(splineDolly.createParams({ spline: line, position: 1.5, positionUnits: 'distance' })).out.position,
      [1.5, 0, 0],
    );
  });

  it('offsets the camera to the side, up and along the path', () => {
    const params = splineDolly.createParams({ spline: line, position: 0.25, splineOffset: [1, 2, 0.5] });
    expectVec3(run(params).out.position, [1.5, 2, 1]);
  });

  it('still offsets the camera along a path that goes straight up', () => {
    const shaft = spline.create([
      [0, 0, 0],
      [0, 5, 0],
    ]);
    const { out } = run(splineDolly.createParams({ spline: shaft, position: 0.5, splineOffset: [1, 1, 0] }));
    expectVec3(out.position, [1, 2.5, 1]);
  });

  it('snaps on activation, then travels toward a new position with damping', () => {
    const params = splineDolly.createParams({ spline: line, position: 0, damping: 0.5 });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, 1 / 60, true);
    expectVec3(out.position, [0, 0, 0]);

    params.position = 1;
    splineDolly.update(out, state, params, 1 / 60, false);
    expect(out.position[0]).toBeGreaterThan(0);
    expect(out.position[0]).toBeLessThan(0.5);
    for (let i = 0; i < 300; i++) splineDolly.update(out, state, params, 1 / 60, false);
    expectVec3(out.position, [4, 0, 0]);

    params.position = 0;
    splineDolly.update(out, state, params, 1 / 60, true);
    expectVec3(out.position, [0, 0, 0]);
  });

  it('travels a closed path the way its position changes, the long way round too', () => {
    const params = splineDolly.createParams({ spline: square, position: 0.1, damping: 0.5 });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, 1 / 60, true);

    params.position = 0.9;
    for (let i = 0; i < 300; i++) {
      splineDolly.update(out, state, params, 1 / 60, false);
      const normalized = state.distance / square.length;
      expect(normalized).toBeGreaterThan(0.099);
      expect(normalized).toBeLessThan(0.901);
    }
    expect(state.distance / square.length).toBeCloseTo(0.9, 4);
  });

  it('laps a closed path past its end, crossing the seam forward', () => {
    const params = splineDolly.createParams({ spline: square, position: 0.9, damping: 0.5 });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, 1 / 60, true);

    params.position = 1.05;
    for (let i = 0; i < 300; i++) {
      splineDolly.update(out, state, params, 1 / 60, false);
      const normalized = state.distance / square.length;
      expect(normalized > 0.899 || normalized < 0.051).toBe(true);
    }
    expect(state.distance / square.length).toBeCloseTo(0.05, 4);
  });

  it('puts a lapped position on the same point in any units', () => {
    const at = (position: number, positionUnits: 'normalized' | 'knot') =>
      run(splineDolly.createParams({ spline: square, position, positionUnits })).out.position;
    expectVec3(at(2.5, 'knot'), at(6.5, 'knot'));
    expectVec3(at(0.3, 'normalized'), at(-0.7, 'normalized'));
  });
});

describe('splineDolly.prime', () => {
  it('starts the next activation from the point of the path nearest to a position', () => {
    const params = splineDolly.createParams({ spline: line, position: 0, damping: 1 });
    const state = splineDolly.createState();
    splineDolly.prime(state, params, [3, 2, 0]);
    const out = cameraState.create();
    splineDolly.update(out, state, params, 1 / 60, true);
    expect(out.position[0]).toBeGreaterThan(2.9);
    expect(out.position[0]).toBeLessThan(3);
  });
});
