import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it, vi } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { OrbitFollowBody } from '../../../src/core/body/OrbitFollowBody';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

import { yaw } from '../mathHelpers';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

describe('OrbitFollowBody', () => {
  it('takes axis settings in its options, keeping the defaults it is not given, and starts each axis at its center', () => {
    const body = new OrbitFollowBody(targetPose.create(), {
      horizontal: { center: 30, damping: 0.2 },
      radial: { range: [-1, 1] },
    });
    expect(body.horizontal).toMatchObject({ center: 30, value: 30, damping: 0.2, range: [-180, 180], wrap: true });
    expect(body.vertical).toMatchObject({ center: 0, value: 0, range: [-90, 90] });
    expect(body.radial).toMatchObject({ range: [-1, 1], value: 0 });
  });

  it('exposes its axes to the camera it is set on', () => {
    const body = new OrbitFollowBody(targetPose.create());
    const camera = new VirtualCamera('orbit');
    camera.setBody(body);
    expect(camera.inputAxes.horizontal).toBe(body.horizontal);
    expect(camera.inputAxes.vertical).toBe(body.vertical);
    expect(camera.inputAxes.radial).toBe(body.radial);
  });

  it('captures the target rotation for lockToTargetOnAssign on a new target and on activation', () => {
    const first = targetPose.create();
    first.hasRotation = true;
    const body = new OrbitFollowBody(first, { bindingMode: 'lockToTargetOnAssign' });
    const out = cameraState.create();
    body.update(out, 0.016, false);
    expectVec3(out.position, [0, 0, 10]);

    const second = targetPose.create();
    second.hasRotation = true;
    quat.copy(second.rotation, yaw(90));
    body.target = second;
    body.update(out, 0.016, false);
    expectVec3(out.position, vec3.transformQuat(vec3.create(), [0, 0, 10], yaw(90)));

    quat.identity(second.rotation);
    body.update(out, 0.016, false);
    expectVec3(out.position, vec3.transformQuat(vec3.create(), [0, 0, 10], yaw(90)));
    body.update(out, 0.016, true);
    expectVec3(out.position, [0, 0, 10]);
  });

  it('asks for a frame from setFromPosition and setFromRotation', () => {
    const body = new OrbitFollowBody(targetPose.create());
    const camera = new VirtualCamera('orbit');
    camera.setBody(body);
    const klipp = new Klipp();
    klipp.add(camera);
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);

    body.setFromPosition([5, 0, 5]);
    body.setFromRotation(quat.create());
    expect(requested).toHaveBeenCalledTimes(2);
  });

  it('eases setFromPosition with its damping, and input on any axis stops the whole move', () => {
    const body = new OrbitFollowBody(targetPose.create());
    const out = cameraState.create();
    body.setFromPosition([-10, 10, 0], { damping: 0.3 });
    body.update(out, 0.016, false);
    expect(body.horizontal.value).toBeGreaterThan(0);
    expect(body.horizontal.value).toBeLessThan(90);

    body.radial.applyDelta(0.1);
    body.update(out, 0.016, false);
    const { value } = body.horizontal;
    for (let i = 0; i < 10; i++) body.update(out, 0.016, false);
    expect(body.horizontal.value).toBe(value);
  });

  it('recenters behind the target on triggerRecentering, also while recentering is off', () => {
    const settled = (enabled: boolean) => {
      const target = targetPose.create();
      quat.copy(target.rotation, yaw(90));
      target.hasRotation = true;
      const body = new OrbitFollowBody(target, { horizontal: { recentering: { enabled, wait: 0, time: 0.1 } } });
      const out = cameraState.create();
      body.update(out, 0.016, true);
      body.horizontal.triggerRecentering();
      for (let i = 0; i < 300; i++) body.update(out, 0.016, false);
      return body.horizontal.value;
    };
    expect(settled(false)).toBeCloseTo(settled(true), 6);
    expect(Math.abs(settled(false))).toBeGreaterThan(1);
  });

  describe('forward', () => {
    const toTarget = (out: ReturnType<typeof cameraState.create>): Vec3 =>
      vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), out.target, out.position));

    it('points from the camera at the tracked point, for both orbit styles and a turned binding frame', () => {
      const pose = targetPose.create();
      pose.hasRotation = true;
      quat.copy(pose.rotation, yaw(70));
      for (const options of [
        {},
        { orbitStyle: 'threeRing' as const },
        { bindingMode: 'lockToTarget' as const, targetOffset: [0, 1, 0] as Vec3 },
      ]) {
        const body = new OrbitFollowBody(pose, { ...options, horizontal: { center: 40 }, vertical: { center: 25 } });
        const out = cameraState.create();
        body.update(out, 1 / 60, true);
        expectVec3(body.forward(vec3.create()), toTarget(out));
      }
    });

    it('stays on the axes while a damped Body lags behind a moving target', () => {
      const pose = targetPose.create();
      const body = new OrbitFollowBody(pose, { damping: 0.5, horizontal: { center: 30 } });
      const out = cameraState.create();
      body.update(out, 1 / 60, true);
      const first = body.forward(vec3.create());
      for (let i = 1; i < 30; i++) {
        vec3.set(pose.position, i * 0.2, 0, 0);
        body.update(out, 1 / 60, false);
        expectVec3(body.forward(vec3.create()), first);
      }
    });

    it('flatten keeps the horizontal heading, level with the ground, also at a pole', () => {
      const body = new OrbitFollowBody(targetPose.create(), { horizontal: { center: -90 }, vertical: { center: 40 } });
      body.update(cameraState.create(), 1 / 60, true);
      expectVec3(body.forward(vec3.create(), true), [-1, 0, 0]);
      body.vertical.setValue(90);
      expectVec3(body.forward(vec3.create(), true), [-1, 0, 0]);
    });
  });
});
