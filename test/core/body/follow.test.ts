import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as follow from '../../../src/core/body/follow';
import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

describe('follow.update', () => {
  it('measures the offset with y along up, and passes it on as referenceUp', () => {
    const state = follow.createState();
    const params = follow.createParams({ offset: [0, 3, 8], bindingMode: 'worldSpace' });
    const target = targetPose.create();
    vec3.set(target.position, 1, 2, 3);
    const out = cameraState.create();
    follow.update(out, state, params, target, 0.016, false, [0, 0, 1]);
    expectVec3(out.position, [1, -6, 6]);
    expectVec3(out.referenceUp, [0, 0, 1]);
  });

  it('keeps to up, not to the referenceUp it wrote the frame before', () => {
    const state = follow.createState();
    const params = follow.createParams({ bindingMode: 'lockToTargetNoRoll' });
    const target = targetPose.create();
    target.hasRotation = true;
    quat.setAxisAngle(target.rotation, [1, 0, 0], 0.5);
    const out = cameraState.create();
    follow.update(out, state, params, target, 0.016, false);
    const first = vec3.clone(out.position);
    follow.update(out, state, params, target, 0.016, false);
    expectVec3(out.position, first);
    expectVec3(state.tracker.up, [0, 1, 0]);
  });
});
