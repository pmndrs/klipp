import type { Quat } from 'math';
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as damping from '../../../src/core/damping/damping';

import { QuaternionDamper } from '../../../src/three/damping/QuaternionDamper';

describe('QuaternionDamper', () => {
  it('matches dampQuaternion step for step, including reset', () => {
    const wrapper = new QuaternionDamper();
    const state = damping.createState();
    const rotation = new Quaternion();
    const tuple: Quat = [0, 0, 0, 1];
    const axis = new Vector3(0.3, 1, 0.2).normalize();

    for (let i = 0; i < 60; i++) {
      if (i === 30) {
        wrapper.reset();
        damping.reset(state);
      }
      const target = new Quaternion().setFromAxisAngle(axis, i * 0.05);
      expect(wrapper.update(rotation, target, 0.3, 1 / 60, 2)).toBe(rotation);
      damping.dampQuaternion(state, tuple, [target.x, target.y, target.z, target.w], 0.3, 1 / 60, 2);
      expect(tuple).toEqual(rotation.toArray());
    }
  });
});
