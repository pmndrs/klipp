import { quat, vec3, type Quat } from 'math';
import { describe, expect, it } from 'vitest';

import * as damping from '../../../src/core/damping/damping';

import { angleBetween, yaw } from '../mathHelpers';

const tilted = (): Quat => quat.setAxisAngle(quat.create(), vec3.normalize(vec3.create(), [0.3, 1, -0.2]), 1.7);

describe('dampQuaternion', () => {
  it('snaps on the first call, after a reset and with damping 0', () => {
    const state = damping.createState();
    const out = quat.create();
    expect(angleBetween(damping.dampQuaternion(state, out, yaw(90), 0.5, 0.016), yaw(90))).toBeLessThan(1e-6);

    damping.dampQuaternion(state, quat.identity(out), yaw(90), 0.5, 0.016);
    damping.reset(state);
    expect(angleBetween(damping.dampQuaternion(state, tilted(), yaw(20), 0.5, 0.016), yaw(20))).toBeLessThan(1e-6);

    expect(damping.dampQuaternion(damping.createState(), quat.create(), tilted(), 0, 0.016)).toEqual(tilted());
  });

  it('eases into the target once warm and settles on it', () => {
    const state = damping.createState();
    const out = quat.create();
    damping.dampQuaternion(state, out, tilted(), { into: 0.2, from: 0.4 }, 0.016);
    quat.identity(out);

    damping.dampQuaternion(state, out, tilted(), { into: 0.2, from: 0.4 }, 0.016);
    expect(angleBetween(out, quat.create())).toBeGreaterThan(0);
    expect(angleBetween(out, tilted())).toBeGreaterThan(0.01);

    for (let i = 0; i < 300; i++) damping.dampQuaternion(state, out, tilted(), { into: 0.2, from: 0.4 }, 0.016);
    expect(angleBetween(out, tilted())).toBeLessThan(1e-3);
  });

  it('turns the short way round', () => {
    const state = damping.createState();
    const out = quat.create();
    damping.dampQuaternion(state, out, yaw(0), 0.5, 0.016);

    damping.dampQuaternion(state, out, yaw(350), 0.5, 0.016);

    expect(angleBetween(out, yaw(0))).toBeLessThan((10 * Math.PI) / 180);
    expect(angleBetween(out, yaw(350))).toBeLessThan((10 * Math.PI) / 180);
  });

  it('tracks a rotating target without jumps', () => {
    const state = damping.createState();
    const out = quat.create();
    const speed = 1.5;
    let maxStep = 0;

    for (let i = 1; i <= 300; i++) {
      const before = quat.clone(out);
      damping.dampQuaternion(state, out, quat.setAxisAngle(quat.create(), [0, 1, 0], (speed * i) / 60), 0.3, 1 / 60);
      maxStep = Math.max(maxStep, angleBetween(before, out));
    }

    expect(maxStep).toBeLessThan((speed / 60) * 5);
  });

  it('maxSpeed caps how far one step turns', () => {
    const step = (maxSpeed?: number) => {
      const state = damping.createState();
      const out = quat.create();
      damping.dampQuaternion(state, out, yaw(90), 1, 0.05, maxSpeed);
      return angleBetween(damping.dampQuaternion(state, quat.identity(out), yaw(90), 1, 0.05, maxSpeed), quat.create());
    };

    expect(step(1)).toBeLessThan(step());
  });

  it('a reset followed by an on-target call uses up the snap there (real bug: the next move still snapped)', () => {
    const state = damping.createState();
    const out = yaw(90);

    damping.reset(state);
    damping.dampQuaternion(state, out, yaw(90), 0.5, 1 / 60);
    damping.dampQuaternion(state, out, yaw(150), 0.5, 1 / 60);

    expect(angleBetween(out, yaw(90))).toBeLessThan(0.1);
    expect(angleBetween(out, yaw(150))).toBeGreaterThan(0.5);
  });
});
