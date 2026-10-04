import { quat, vec3, type Quat } from 'math';
import { describe, expect, it } from 'vitest';

import * as panTilt from '../../../src/core/aim/panTilt';
import * as cameraState from '../../../src/core/CameraState';

function roundTrip(targetRotation: Quat | null, rotation: Quat): Quat {
  const state = panTilt.createState();
  const out = cameraState.create();
  if (targetRotation) vec3.transformQuat(out.referenceUp, [0, 1, 0], targetRotation);
  panTilt.seed(state, targetRotation, rotation, out.referenceUp);
  // A long step settles both axes on their seeded values.
  panTilt.update(out, state, targetRotation, 1);
  return out.quaternion;
}

const expectSameRotation = (a: Quat, b: Quat) => expect(Math.abs(quat.dot(a, b))).toBeCloseTo(1, 9);

describe('panTilt.seed', () => {
  it('reproduces the seeded rotation without a target rotation', () => {
    const rotation = quat.fromEuler(quat.create(), [-0.4, 0.9, 0, 'yxz']);
    expectSameRotation(roundTrip(null, rotation), rotation);
  });

  it('reproduces the seeded rotation relative to a pitched target', () => {
    const targetRotation = quat.fromEuler(quat.create(), [0.6, 0.3, 0, 'yxz']);
    const relative = quat.fromEuler(quat.create(), [-0.3, 0.5, 0, 'yxz']);
    const rotation = quat.multiply(quat.create(), targetRotation, relative);
    expectSameRotation(roundTrip(targetRotation, rotation), rotation);
  });
});
