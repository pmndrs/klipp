import type { Vec3 } from 'math';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as predictor from '../../../src/core/damping/predictor';

import { Predictor } from '../../../src/three/damping/Predictor';

describe('Predictor', () => {
  it('matches the predictor functions step for step, including reset', () => {
    const wrapper = new Predictor();
    const state = predictor.create();
    const delta = new Vector3();

    for (let i = 0; i < 60; i++) {
      if (i === 30) {
        wrapper.reset();
        predictor.reset(state);
      }
      const position = new Vector3(Math.sin(i * 0.1) * 10, i * 0.2, -i);
      wrapper.addPosition(position, 1 / 60, 3);
      predictor.addPosition(state, position.toArray() as Vec3, 1 / 60, 3);
      expect(wrapper.state).toEqual(state);
      expect(wrapper.predictPositionDelta(delta, 0.5)).toBe(delta);
      expect(delta.toArray()).toEqual(predictor.predictDelta([0, 0, 0], state, 0.5));
    }
  });
});
