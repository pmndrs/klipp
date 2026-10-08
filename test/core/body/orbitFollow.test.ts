import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as hardLookAt from '../../../src/core/aim/hardLookAt';
import * as panTilt from '../../../src/core/aim/panTilt';
import * as rotationComposer from '../../../src/core/aim/rotationComposer';
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
    const { params, target, out, step } = setup();
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

describe('orbitFollow recentering', () => {
  function recentering(times: { horizontal: number; vertical: number }) {
    const scene = setup();
    const { state } = scene;
    state.horizontal.recentering = { enabled: true, wait: 0.5, time: times.horizontal };
    state.vertical.recentering = { enabled: true, wait: 0.5, time: times.vertical };
    state.vertical.setValue(40);
    return scene;
  }

  it('holds every axis with the same time while one of them gets input, then recenters them together', () => {
    const { state, step } = recentering({ horizontal: 0.3, vertical: 0.3 });
    for (let i = 0; i < 120; i++) {
      state.horizontal.applyDelta(0.1);
      step();
    }
    expect(state.vertical.value).toBe(40);

    for (let i = 0; i < 600; i++) step();
    expect(state.vertical.value).toBeCloseTo(0, 6);
    expect(state.horizontal.value).toBeCloseTo(0, 6);
  });

  it('recenters an axis with another time while the other gets input', () => {
    const { state, step } = recentering({ horizontal: 0.3, vertical: 0.4 });
    for (let i = 0; i < 300; i++) {
      state.horizontal.applyDelta(0.1);
      step();
    }
    expect(state.vertical.value).toBeCloseTo(0, 6);
  });

  it("recenters horizontal behind the target's forward with trackingTarget", () => {
    const { state, target, out, step } = recentering({ horizontal: 0.2, vertical: 0.2 });
    state.vertical.recentering = { enabled: false, wait: 0.5, time: 0.2 };
    state.vertical.setValue(0);
    target.hasRotation = true;
    quat.copy(target.rotation, yaw(90));
    for (let i = 0; i < 600; i++) step();
    expect(state.horizontal.value).toBeCloseTo(-90, 6);
    expectVec3(out.position, [10, 0, 0]);
  });

  it('recenters to the axis center with axisCenter', () => {
    const { state, params, target, step } = recentering({ horizontal: 0.2, vertical: 0.2 });
    params.recenteringTarget = 'axisCenter';
    target.hasRotation = true;
    quat.copy(target.rotation, yaw(90));
    state.horizontal.setValue(50);
    for (let i = 0; i < 600; i++) step();
    expect(state.horizontal.value).toBeCloseTo(0, 6);
  });

  it('reads the target rotation for trackingTarget only while horizontal recenters', () => {
    const { state, params } = setup();
    expect(orbitFollow.needsTargetRotation(state, params)).toBe(false);
    state.horizontal.recentering = { enabled: true, wait: 1, time: 1 };
    expect(orbitFollow.needsTargetRotation(state, params)).toBe(true);
    params.recenteringTarget = 'axisCenter';
    expect(orbitFollow.needsTargetRotation(state, params)).toBe(false);
  });
});

describe('orbitFollow rotation damping bypass', () => {
  function orbitWithComposer() {
    const scene = setup();
    const composerState = rotationComposer.createState();
    const composerParams = rotationComposer.createParams({ damping: 0.5 });
    const frame = (justActivated = false) => {
      orbitFollow.update(scene.out, scene.state, scene.params, scene.target, 0.016, justActivated);
      rotationComposer.update(scene.out, composerState, composerParams, scene.target, 0.016, justActivated);
    };
    return { ...scene, frame };
  }

  it('keeps the target centered for a damped Aim while the orbit turns', () => {
    const { state, out, frame } = orbitWithComposer();
    frame(true);
    for (let i = 0; i < 60; i++) {
      state.horizontal.applyDelta(3);
      state.vertical.applyDelta(0.5);
      frame();
      expect(forwardDot(out.quaternion, out.position, [0, 0, 0])).toBeCloseTo(1, 9);
    }
  });

  it('is the turn of the orbit between frames, and identity on activation and without a target', () => {
    const { state, params, out, step } = setup();
    orbitFollow.update(out, state, orbitFollow.createParams(), targetPose.create(), 0.016, true);
    expect(out.rotationDampingBypass).toEqual([0, 0, 0, 1]);

    state.horizontal.applyDelta(30);
    step();
    expect(angleBetween(out.rotationDampingBypass, yaw(-30))).toBeCloseTo(0, 9);

    orbitFollow.update(out, state, params, null, 0.016, false);
    expect(out.rotationDampingBypass).toEqual([0, 0, 0, 1]);
  });
});

describe('orbitFollow threeRing', () => {
  function rings(horizontal: number, vertical: number, radial = 0) {
    const scene = setup();
    scene.params.orbitStyle = 'threeRing';
    scene.state.horizontal.setValue(horizontal);
    scene.state.vertical.setValue(vertical);
    scene.state.radial.setValue(radial);
    scene.step();
    return scene;
  }

  it("runs from the bottom ring at vertical's minimum to the top ring at its maximum", () => {
    expectVec3(rings(0, -90).out.position, [0, -10, 10]);
    expectVec3(rings(0, 0).out.position, [0, 0, 10]);
    expectVec3(rings(0, 90).out.position, [0, 10, 10]);
  });

  it('is a plain cylinder of the default radius by default, starting where the sphere starts', () => {
    for (const vertical of [-60, -20, 30, 75]) {
      const { position } = rings(0, vertical).out;
      expect(Math.hypot(position[0], position[2])).toBeCloseTo(10, 9);
    }
    expectVec3(rings(0, 0).out.position, place(0, 0).out.position);
  });

  it('turns around the target with horizontal, the same way as the sphere', () => {
    expectVec3(rings(90, 0).out.position, [-10, 0, 0]);
  });

  it('scales the whole surface by exp(radial)', () => {
    expectVec3(rings(0, 90, Math.log(2)).out.position, [0, 20, 20]);
  });

  it('primes both axes from a position on the surface', () => {
    const { out } = rings(30, 45);
    const position = vec3.clone(out.position);

    const { state, params, step } = setup();
    params.orbitStyle = 'threeRing';
    orbitFollow.prime(state, position);
    step();
    expect(state.horizontal.value).toBeCloseTo(30, 6);
    expect(state.vertical.value).toBeCloseTo(45, 4);
  });
});

describe('orbitFollow.point', () => {
  it('is where the camera is for the current axis values, for both styles', () => {
    for (const orbitStyle of ['sphere', 'threeRing'] as const) {
      const { state, params, target, out, step } = setup();
      params.orbitStyle = orbitStyle;
      params.bindingMode = BindingModes.lockToTarget;
      params.damping = 0.5;
      target.hasRotation = true;
      quat.copy(target.rotation, yaw(40));
      step();
      vec3.set(target.position, 3, 1, -2);
      state.horizontal.applyDelta(25);
      state.vertical.applyDelta(30);
      step();
      const position = orbitFollow.point(vec3.create(), state, params, state.horizontal.value, state.vertical.value);
      expectVec3(position, out.position);
    }
  });
});
