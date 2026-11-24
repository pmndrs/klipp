import { vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as follow from '../../../src/core/body/follow';
import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

describe('follow.update', () => {
  it('measures the offset with y along the camera referenceUp, and passes it on', () => {
    const state = follow.createState();
    const params = follow.createParams({ offset: [0, 3, 8], bindingMode: 'worldSpace' });
    const target = targetPose.create();
    vec3.set(target.position, 1, 2, 3);
    const out = cameraState.create();
    vec3.set(out.referenceUp, 0, 0, 1);
    follow.update(out, state, params, target, 0.016, false);
    expectVec3(out.position, [1, -6, 6]);
    expectVec3(out.referenceUp, [0, 0, 1]);
  });
});
