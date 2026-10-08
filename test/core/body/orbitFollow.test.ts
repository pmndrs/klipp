import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as hardLookAt from '../../../src/core/aim/hardLookAt';
import * as panTilt from '../../../src/core/aim/panTilt';
import * as orbitFollow from '../../../src/core/body/orbitFollow';
import * as cameraState from '../../../src/core/CameraState';
import * as targetPose from '../../../src/core/TargetPose';
import { BindingModes } from '../../../src/core/body/BindingModes';

import { angleBetween, forwardDot, yaw } from '../mathHelpers';

function setup() {
  const state = orbitFollow.createState();
  const params = orbitFollow.createParams();
  const target = targetPose.create();
  const out = cameraState.create();
  const step = (dt = 0.016) => orbitFollow.update(out, state, params, target, dt, false);
  return { state, params, target, out, step };
}

function place(horizontal: number, vertical: number, radial = 0) {
  const scene = setup();
  scene.state.horizontal.setValue(horizontal);
  scene.state.vertical.setValue(vertical);
  scene.state.radial.setValue(radial);
  scene.step();
  return scene;
}

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

describe('orbitFollow.update', () => {
  it('places the camera on a sphere of `radius` around the target', () => {
    expectVec3(place(0, 0).out.position, [0, 0, 10]);
    expectVec3(place(90, 0).out.position, [-10, 0, 0]);
    expectVec3(place(0, 30).out.position, [0, 5, 10 * Math.cos(Math.PI / 6)]);
  });

  it('turns the view the same way as PanTilt for the same axis values', () => {
    for (const [horizontal, vertical] of [
      [40, 20],
      [-120, -5],
      [170, 44],
    ]) {
      const { out } = place(horizontal, vertical);
      const aim = panTilt.createState();
      aim.pan.setValue(horizontal);
      aim.tilt.setValue(vertical);
      const view = cameraState.create();
      panTilt.update(view, aim, null, 0.016);
      expect(forwardDot(view.quaternion, out.position, [0, 0, 0])).toBeCloseTo(1, 9);
    }
  });

  it('keeps turning the view with horizontal at the poles', () => {
    for (const vertical of [90, -90]) {
      const views = [0, 90].map((horizontal) => {
        const { out } = place(horizontal, vertical);
        hardLookAt.update(out, [0, 0, 0]);
        expect(forwardDot(out.quaternion, out.position, [0, 0, 0])).toBeCloseTo(1, 6);
        return out.quaternion;
      });
      expect(angleBetween(views[0], views[1])).toBeCloseTo(Math.PI / 2, 3);
    }
  });

  it('scales the radius by exp(radial)', () => {
    expectVec3(place(0, 0, Math.log(2)).out.position, [0, 0, 20]);
    expectVec3(place(0, 0, Math.log(0.5)).out.position, [0, 0, 5]);
  });

  it('writes the tracked point as the body target', () => {
    const { target, out, step } = setup();
    vec3.set(target.position, 1, 2, 3);
    step();
    expectVec3(out.target, [1, 2, 3]);
    expect(out.hasTarget).toBe(true);
  });

  it('measures the orbit and the target offset in the binding frame', () => {
    const { params, state, target, out, step } = setup();
    state.vertical.setValue(0);
    params.bindingMode = BindingModes.lockToTarget;
    params.targetOffset = [0, 1, 0];
    target.hasRotation = true;
    quat.setAxisAngle(target.rotation, [0, 0, 1], Math.PI / 2);
    step();

    expectVec3(out.target, [-1, 0, 0]);
    expectVec3(out.position, [-1, 0, 10]);
    expectVec3(out.referenceUp, [-1, 0, 0]);

    params.bindingMode = BindingModes.worldSpace;
    quat.copy(target.rotation, yaw(90));
    step();
    expectVec3(out.target, [0, 1, 0]);
    expectVec3(out.position, [0, 1, 10]);
  });

  it('eases a change of radius with radial.damping, and snaps without it', () => {
    const { state, params, out, step } = setup();
    state.vertical.setValue(0);
    state.radial.damping = 0.3;
    step();
    expectVec3(out.position, [0, 0, 10]);

    params.radius = 20;
    expect(step()).toBe(true);
    expect(out.position[2]).toBeGreaterThan(10);
    expect(out.position[2]).toBeLessThan(20);
    for (let i = 0; i < 300; i++) step();
    expectVec3(out.position, [0, 0, 20]);
    expect(step()).toBe(false);

    state.radial.damping = 0;
    params.radius = 5;
    step();
    expectVec3(out.position, [0, 0, 5]);
  });

  it('primes the axes from a position, on the same ray at the current radius', () => {
    const { state, target, out, step } = setup();
    vec3.set(target.position, 1, 0, 0);
    orbitFollow.prime(state, [1 - 3, 3, 0]);
    step();
    expect(state.horizontal.value).toBeCloseTo(90, 9);
    expect(state.vertical.value).toBeCloseTo(45, 9);
    const r = 10 / Math.SQRT2;
    expectVec3(out.position, [1 - r, r, 0]);
  });

  it('primes relative to the binding frame and the target offset', () => {
    const { state, params, target, out, step } = setup();
    params.bindingMode = BindingModes.lockToTarget;
    params.targetOffset = [0, 1, 0];
    target.hasRotation = true;
    quat.copy(target.rotation, yaw(90));
    orbitFollow.prime(state, [5, 1, 0]);
    step();
    expect(state.horizontal.value).toBeCloseTo(0, 9);
    expect(state.vertical.value).toBeCloseTo(0, 9);
    expectVec3(out.position, [10, 1, 0]);
  });

  it('waits with priming until there is a target', () => {
    const { state, params, target, out, step } = setup();
    orbitFollow.prime(state, [0, 0, -5]);
    orbitFollow.update(out, state, params, null, 0.016, false);
    expect(state.horizontal.value).toBe(0);
    vec3.set(target.position, 0, 0, 0);
    step();
    expect(Math.abs(state.horizontal.value)).toBeCloseTo(180, 9);
  });

  it('restarts the wait for recentering on activation', () => {
    const { state, params, target, out } = setup();
    state.horizontal.recentering = { enabled: true, wait: 0.5, time: 0.2 };
    state.horizontal.setValue(30);
    state.horizontal.idleTime = 10;
    orbitFollow.update(out, state, params, target, 0.016, true);
    expect(state.horizontal.value).toBe(30);
  });

  it('leaves `out` as is without a target', () => {
    const { state, params, out } = setup();
    vec3.set(out.position, 7, 7, 7);
    orbitFollow.update(out, state, params, null, 0.016, false);
    expectVec3(out.position, [7, 7, 7]);
    expect(out.hasTarget).toBe(false);
  });

  it('reports motion while an axis eases or waits to recenter', () => {
    const { state, step } = setup();
    expect(step()).toBe(false);

    state.horizontal.damping = 0.2;
    state.horizontal.recentering = { enabled: true, wait: 2, time: 0.2 };
    state.horizontal.applyDelta(30);
    expect(step()).toBe(true);
    for (let i = 0; i < 60; i++) step();
    expect(state.horizontal.value).toBeGreaterThan(29);
    expect(step()).toBe(true);
    for (let i = 0; i < 400; i++) step();
    expect(state.horizontal.value).toBe(0);
    expect(step()).toBe(false);
  });
});
