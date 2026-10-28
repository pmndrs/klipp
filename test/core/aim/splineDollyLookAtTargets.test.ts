import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as splineDollyLookAtTargets from '../../../src/core/aim/splineDollyLookAtTargets';
import * as cameraState from '../../../src/core/cameraState';
import * as spline from '../../../src/core/spline';

import { forwardDot } from '../mathHelpers';

const line = spline.create([
  [0, 0, 0],
  [10, 0, 0],
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

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 6);
};

/** How far the view from `position` has turned from `from` toward `to`, as a fraction of the angle between them. */
function turned(position: Vec3, lookAt: Vec3, from: Vec3, to: Vec3): number {
  const toward = (point: Vec3) => vec3.subtract(vec3.create(), point, position);
  return vec3.angle(toward(lookAt), toward(from)) / vec3.angle(toward(from), toward(to));
}

function lookFrom(
  position: Vec3,
  params: splineDollyLookAtTargets.SplineDollyLookAtTargetsParams,
  path: spline.Spline,
  distance: number,
) {
  const out = cameraState.create();
  vec3.copy(out.position, position);
  const state = splineDollyLookAtTargets.createState();
  splineDollyLookAtTargets.update(out, state, params, path, 'normalized', distance);
  return { out, state };
}

describe('splineDollyLookAtTargets.update', () => {
  it('looks the way the path runs without targets, with no look-at target', () => {
    const { out } = lookFrom([3, 0, 0], splineDollyLookAtTargets.createParams(), line, 3);
    expect(forwardDot(out.quaternion, out.position, [10, 0, 0])).toBeCloseTo(1, 6);
    expect(out.hasLookAtTarget).toBe(false);
  });

  it('turns from one target to the next as the camera travels between them', () => {
    const params = splineDollyLookAtTargets.createParams({
      targets: [
        { position: 0, lookAt: [0, 0, 5] },
        { position: 1, lookAt: [10, 0, 5] },
      ],
    });
    const { out, state } = lookFrom([5, 0, 0], params, line, 5);
    expectVec3(state.lookAt, [5, 0, Math.hypot(5, 5)]);
    expect(forwardDot(out.quaternion, out.position, [5, 0, 5])).toBeCloseTo(1, 6);
    expect(out.lookAtTarget).toEqual(state.lookAt);
    expect(out.hasLookAtTarget).toBe(true);
  });

  it('holds on each target for a third of the way with full easing', () => {
    const params = splineDollyLookAtTargets.createParams({
      targets: [
        { position: 0, lookAt: [0, 0, 5] },
        { position: 1, lookAt: [10, 0, 5] },
      ],
      easing: 1,
    });
    const turnedAt = (x: number) =>
      turned([x, 0, 0], lookFrom([x, 0, 0], params, line, x).state.lookAt, [0, 0, 5], [10, 0, 5]);
    expect(turnedAt(2.5)).toBeCloseTo(0, 6);
    expect(turnedAt(5)).toBeCloseTo(0.5, 6);
    expect(turnedAt(7.5)).toBeCloseTo(1, 6);
  });

  it('holds the nearest target before the first and after the last on an open path', () => {
    const params = splineDollyLookAtTargets.createParams({
      targets: [
        { position: 0.75, lookAt: [8, 0, 5] },
        { position: 0.25, lookAt: [2, 0, 5] },
      ],
    });
    expectVec3(lookFrom([1, 0, 0], params, line, 1).state.lookAt, [2, 0, 5]);
    expectVec3(lookFrom([9, 0, 0], params, line, 9).state.lookAt, [8, 0, 5]);
  });

  it('goes round a closed path from the last target to the first', () => {
    const params = splineDollyLookAtTargets.createParams({
      targets: [
        { position: 0.25, lookAt: [0, 0, 0] },
        { position: 0.75, lookAt: [10, 0, 0] },
      ],
    });
    const turnedAt = (normalized: number) =>
      turned(
        [5, 0, -5],
        lookFrom([5, 0, -5], params, square, spline.toDistance(square, normalized, 'normalized')).state.lookAt,
        [10, 0, 0],
        [0, 0, 0],
      );
    expect(turnedAt(0.9)).toBeCloseTo(0.3, 6);
    expect(turnedAt(0.1)).toBeCloseTo(0.7, 6);
  });

  it('turns round the camera, never through the floor or the sky, between targets on either side of it', () => {
    const params = splineDollyLookAtTargets.createParams({
      targets: [
        { position: 0, lookAt: [5, 1, -5] },
        { position: 1, lookAt: [5, -1, 5] },
      ],
    });
    for (let x = 0.5; x < 10; x += 0.5) {
      const { out } = lookFrom([x, 0, 0], params, line, x);
      const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], out.quaternion);
      expect(Math.abs(forward[1])).toBeLessThan(0.2);
    }
  });

  it('keeps its tilt while it pans between targets almost across from each other', () => {
    const params = splineDollyLookAtTargets.createParams({
      targets: [
        { position: 0, lookAt: [4, 0, -5] },
        { position: 1, lookAt: [5.5, 0, 5] },
      ],
    });
    const { out } = lookFrom([5, 2, 0], params, line, 5);
    const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], out.quaternion);
    expect(forward[1]).toBeCloseTo(-2 / Math.hypot(1, 2, 5), 1);
  });

  it('turns round referenceUp between targets straight across from each other', () => {
    const params = splineDollyLookAtTargets.createParams({
      targets: [
        { position: 0, lookAt: [5, 0, -5] },
        { position: 1, lookAt: [5, 0, 5] },
      ],
    });
    const { out } = lookFrom([5, 0, 0], params, line, 5);
    const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], out.quaternion);
    expect(forward[1]).toBeCloseTo(0, 6);
    expect(Math.abs(forward[0])).toBeCloseTo(1, 6);
  });

  it('keeps its rotation where the path stands still', () => {
    const out = cameraState.create();
    quat.setAxisAngle(out.quaternion, [0, 1, 0], 1);
    const before = quat.clone(out.quaternion);
    splineDollyLookAtTargets.update(
      out,
      splineDollyLookAtTargets.createState(),
      splineDollyLookAtTargets.createParams(),
      spline.create([[1, 2, 3]]),
      'normalized',
      0,
    );
    expect(out.quaternion).toEqual(before);
  });
});
