import { describe, expect, it } from 'vitest';

import * as damping from '../../../src/core/damping/damping';

describe('dampVector3', () => {
  it('snaps on the first call, after a reset and with damping 0', () => {
    const state = damping.createVector3State();
    expect(damping.dampVector3(state, [0, 0, 0], [10, -5, 2], 0.5, 0.016)).toEqual([10, -5, 2]);

    damping.dampVector3(state, [0, 0, 0], [10, 0, 0], 0.5, 0.016);
    damping.resetVector3(state);
    expect(damping.dampVector3(state, [999, -999, 999], [1, 2, 3], 0.5, 0.016)).toEqual([1, 2, 3]);

    expect(damping.dampVector3(damping.createVector3State(), [0, 0, 0], [10, -5, 2], 0, 0.016)).toEqual([10, -5, 2]);
  });

  it('eases each axis on its own and settles on the target', () => {
    const state = damping.createVector3State();
    const out = damping.dampVector3(state, [0, 0, 0], [10, 0, 0], 0.5, 0.1);

    damping.dampVector3(state, out, [10, 10, 0], 0.5, 0.1);
    expect(out[0]).toBe(10);
    expect(out[1]).toBeGreaterThan(0);
    expect(out[1]).toBeLessThan(10);

    for (let i = 0; i < 300; i++) damping.dampVector3(state, out, [10, 5, -3], 0.3, 0.016);
    expect(out.map((v) => +v.toFixed(2))).toEqual([10, 5, -3]);
  });

  it('maxSpeed caps how far one step moves', () => {
    const step = (maxSpeed?: number) => {
      const state = damping.createVector3State();
      damping.dampVector3(state, [0, 0, 0], [100, 0, 0], 1, 0.05, maxSpeed);
      return damping.dampVector3(state, [0, 0, 0], [100, 0, 0], 1, 0.05, maxSpeed)[0];
    };

    expect(step(2)).toBeLessThan(step());
  });
});
