import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as impulseListener from '../../../src/core/impulse/impulseListener';
import { ImpulseField } from '../../../src/core/impulse/ImpulseField';

describe('impulseListener.update', () => {
  it('pushes out by the impulse felt at its position and returns its strength', () => {
    const field = new ImpulseField();
    field.generate({ position: [0, 0, 0], direction: [2, 0, 0], shape: () => 1, duration: 10 }, 0);
    const out = cameraState.create();

    const strength = impulseListener.update(out, impulseListener.createParams({ field }), 0.5);

    expect(out.position).toEqual([2, 0, 0]);
    expect(strength).toBe(1);
  });
});
