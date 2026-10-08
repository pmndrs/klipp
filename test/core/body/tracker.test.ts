import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as tracker from '../../../src/core/body/tracker';
import * as targetPose from '../../../src/core/TargetPose';
import { BindingModes } from '../../../src/core/body/BindingModes';

import { yaw } from '../mathHelpers';

function setup(damping = 0) {
  const state = tracker.createState();
  const params: tracker.TrackerParams = { bindingMode: BindingModes.worldSpace, damping, maxSpeed: Infinity };
  const target = targetPose.create();
  const point: Vec3 = [0, 0, 0];
  const orientation = quat.create();
  const track = (offset: Vec3, dt = 0.016, targetOffset: Vec3 = [0, 0, 0]) =>
    tracker.trackTarget(point, orientation, state, params, target, offset, targetOffset, dt);
  return { state, params, target, point, orientation, track };
}

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

describe('tracker.trackTarget', () => {
  it('tracks the target position exactly without damping', () => {
    const { target, point, track } = setup();
    vec3.set(target.position, 1, 2, 3);
    track([0, 0, 10]);
    expectVec3(point, [1, 2, 3]);

    vec3.set(target.position, -4, 0, 5);
    track([0, 0, 10]);
    expectVec3(point, [-4, 0, 5]);
  });

  it('snaps on the first call, then chases a moving target with damping', () => {
    const { target, point, track } = setup(0.5);
    vec3.set(target.position, 1, 0, 0);
    track([0, 0, 10]);
    expectVec3(point, [1, 0, 0]);

    vec3.set(target.position, 5, 0, 0);
    track([0, 0, 10]);
    expect(point[0]).toBeGreaterThan(1);
    expect(point[0]).toBeLessThan(5);

    for (let i = 0; i < 600; i++) track([0, 0, 10]);
    expectVec3(point, [5, 0, 0]);
  });

  it('turns the lagging point with the offset instead of damping the turn', () => {
    const { target, point, track } = setup(1);
    track([0, 0, 10]);
    vec3.set(target.position, 4, 0, 0);
    track([0, 0, 10]);
    const lag = vec3.subtract(vec3.create(), point, target.position);

    const turn = yaw(90);
    const offset = vec3.transformQuat(vec3.create(), [0, 0, 10], turn);
    track(offset, 0);
    expectVec3(vec3.subtract(vec3.create(), point, target.position), vec3.transformQuat(vec3.create(), lag, turn));
  });

  it('turns the lagging point with a change of pitch', () => {
    const { target, point, track } = setup(1);
    track([0, 0, 10]);
    vec3.set(target.position, 0, 0, 4);
    track([0, 0, 10]);
    const lag = vec3.subtract(vec3.create(), point, target.position);

    const pitch = quat.setAxisAngle(quat.create(), [1, 0, 0], -Math.PI / 6);
    track(vec3.transformQuat(vec3.create(), [0, 0, 10], pitch), 0);
    expectVec3(vec3.subtract(vec3.create(), point, target.position), vec3.transformQuat(vec3.create(), lag, pitch));
  });

  it('keeps the camera on the orbit while the offset turns around a resting target', () => {
    const { point, track } = setup(1);
    track([0, 0, 10]);
    for (let degrees = 5; degrees <= 180; degrees += 5) {
      const offset = vec3.transformQuat(vec3.create(), [0, 0, 10], yaw(degrees));
      track(offset);
      expectVec3(point, [0, 0, 0]);
    }
  });

  it('places the target offset in the reference orientation', () => {
    const { params, target, point, orientation, track } = setup();
    params.bindingMode = BindingModes.lockToTarget;
    target.hasRotation = true;
    quat.copy(target.rotation, yaw(90));
    track([0, 0, 10], 0.016, [1, 0, 0]);
    expectVec3(point, [0, 0, -1]);
    expect(quat.equals(orientation, target.rotation)).toBe(true);

    params.bindingMode = BindingModes.worldSpace;
    track([0, 0, 10], 0.016, [1, 0, 0]);
    expectVec3(point, [1, 0, 0]);
  });

  it('snaps again after a reset', () => {
    const { state, target, point, track } = setup(1);
    track([0, 0, 10]);
    vec3.set(target.position, 10, 0, 0);
    tracker.reset(state);
    track([0, 0, 10]);
    expectVec3(point, [10, 0, 0]);
  });
});
