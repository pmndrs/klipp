import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Vec3 } from 'math';
import { Vector3Damper } from '../../../src/three/damping/Vector3Damper';
import * as damping from '../../../src/core/damping/damping';

describe('Vector3Damper', () => {
  it('matches dampVector3 step for step, including reset', () => {
    const wrapper = new Vector3Damper();
    const state = damping.createVector3State();
    const vector = new Vector3();
    const tuple: Vec3 = [0, 0, 0];

    for (let i = 0; i < 60; i++) {
      if (i === 30) {
        wrapper.reset();
        damping.resetVector3(state);
      }
      const target = new Vector3(Math.sin(i * 0.1) * 10, i * 0.2, -i);
      expect(wrapper.update(vector, target, { into: 0.2, from: 0.5 }, 1 / 60, 30)).toBe(vector);
      damping.dampVector3(state, tuple, [target.x, target.y, target.z], { into: 0.2, from: 0.5 }, 1 / 60, 30);
      expect(tuple).toEqual(vector.toArray());
    }
  });
});
