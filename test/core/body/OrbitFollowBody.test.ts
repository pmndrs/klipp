import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/CameraState';
import * as targetPose from '../../../src/core/TargetPose';
import { BindingModes } from '../../../src/core/body/BindingModes';
import { OrbitFollowBody } from '../../../src/core/body/OrbitFollowBody';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

import { yaw } from '../mathHelpers';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

describe('OrbitFollowBody', () => {
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
    const body = new OrbitFollowBody(first, { bindingMode: BindingModes.lockToTargetOnAssign });
    body.vertical.setValue(0);
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
});
