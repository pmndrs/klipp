import { vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as blend from '../../../src/core/blend/blend';
import * as cameraState from '../../../src/core/cameraState';
import { BlendCurves } from '../../../src/core/blend/BlendCurves';
import type { BlendDefinition } from '../../../src/core/blend/BlendDefinition';
import { BlendHints } from '../../../src/core/blend/BlendHints';

const linear: BlendDefinition = { curve: BlendCurves.linear, time: 1 };
const states = { a: cameraState.create(), b: cameraState.create(), c: cameraState.create() };
type Name = keyof typeof states;

function setup(first: Name = 'a') {
  const state = blend.create<Name>();
  blend.setTarget(state, first, states[first], linear);
  blend.tick(state, 0, states[first]);
  const to = (name: Name, definition = linear) => blend.setTarget(state, name, states[name], definition);
  const tick = (dt: number) => blend.tick(state, dt, states[blend.targetName(state)!]);
  const weights = () => ({
    a: blend.weightOf(state, 'a'),
    b: blend.weightOf(state, 'b'),
    c: blend.weightOf(state, 'c'),
  });
  return { state, to, tick, weights };
}

const expectWeights = (actual: Record<Name, number>, expected: Record<Name, number>) => {
  for (const name of ['a', 'b', 'c'] as const) expect(actual[name]).toBeCloseTo(expected[name], 9);
};

describe('blend.weightOf', () => {
  it('gives the live camera all of the output when settled, and the first camera all of it at once', () => {
    const { weights } = setup();
    expectWeights(weights(), { a: 1, b: 0, c: 0 });
  });

  it('follows the curve during a blend, starting from the outgoing camera before the first tick', () => {
    const { to, tick, weights } = setup();
    to('b', { curve: BlendCurves.easeIn, time: 1 });
    expectWeights(weights(), { a: 1, b: 0, c: 0 });
    tick(0.5);
    const eased = BlendCurves.easeIn(0.5);
    expectWeights(weights(), { a: 1 - eased, b: eased, c: 0 });
    tick(0.5);
    expectWeights(weights(), { a: 0, b: 1, c: 0 });
  });

  it('follows the damped progress of a damped blend', () => {
    const { state, to, tick, weights } = setup();
    to('b', { damping: 0.5 });
    tick(0.2);
    const progress = state.transition.progress;
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
    expectWeights(weights(), { a: 1 - progress, b: progress, c: 0 });
  });

  it('splits an interrupted blend between every camera still in the frozen output', () => {
    const { to, tick, weights } = setup();
    to('b');
    tick(0.4);
    to('c');
    tick(0.5);
    expectWeights(weights(), { a: 0.6 * 0.5, b: 0.4 * 0.5, c: 0.5 });
    to('a');
    tick(0.5);
    expectWeights(weights(), { a: 0.3 * 0.5 + 0.5, b: 0.2 * 0.5, c: 0.5 * 0.5 });
  });

  it('jumps on a cut', () => {
    const { to, tick, weights } = setup();
    to('b', { curve: BlendCurves.cut, time: 0 });
    tick(0.016);
    expectWeights(weights(), { a: 0, b: 1, c: 0 });
  });

  it('drops a camera that went away, from the target and from the frozen output', () => {
    const { state, to, tick, weights } = setup();
    to('b');
    tick(0.4);
    to('c');
    tick(0.5);
    blend.forget(state, 'a');
    expectWeights(weights(), { a: 0, b: 0.2, c: 0.5 });
    blend.forget(state, 'c');
    expectWeights(weights(), { a: 0, b: 0, c: 0 });
  });
});

describe('blend.tick', () => {
  it('blends around the target after interrupting a blend that started from a camera without one', () => {
    const free = cameraState.create();
    vec3.set(free.position, 0, 0, 10);
    const orbit = (x: number, z: number) => {
      const out = cameraState.create();
      vec3.set(out.position, x, 0, z);
      out.hasTarget = true;
      return out;
    };
    const right = orbit(10, 0);
    const behind = orbit(0, -10);

    const state = blend.create<string>();
    blend.setTarget(state, 'free', free, linear);
    blend.tick(state, 0, free);
    blend.setTarget(state, 'right', right, linear, BlendHints.sphericalPosition);
    const interrupted = vec3.length(blend.tick(state, 0.5, right).position);
    blend.setTarget(state, 'behind', behind, linear, BlendHints.sphericalPosition);
    const output = blend.tick(state, 0.5, behind);

    expect(output.hasTarget).toBe(true);
    expect(vec3.length(output.position)).toBeCloseTo((interrupted + 10) / 2, 9);
  });

  it('keeps going the same way round the target while the incoming camera turns past half a turn', () => {
    const around = (out: cameraState.CameraState, degrees: number) => {
      const radians = (degrees * Math.PI) / 180;
      vec3.set(out.position, Math.sin(radians) * 10, 0, Math.cos(radians) * 10);
      out.hasTarget = true;
      return out;
    };
    const start = around(cameraState.create(), 0);
    const turning = around(cameraState.create(), 0);
    const bearing = ({ position }: cameraState.CameraState) => Math.atan2(position[0], position[2]);

    const state = blend.create<string>();
    blend.setTarget(state, 'start', start, linear);
    blend.tick(state, 0, start);
    blend.setTarget(state, 'turning', turning, { curve: BlendCurves.linear, time: 2 }, BlendHints.sphericalPosition);
    let previous = 0;
    for (let degrees = 10; degrees <= 300; degrees += 10) {
      const now = bearing(blend.tick(state, 0.05, around(turning, degrees)));
      expect(Math.abs(Math.atan2(Math.sin(now - previous), Math.cos(now - previous)))).toBeLessThan(Math.PI / 6);
      previous = now;
    }

    blend.setTarget(state, 'start', start, linear, BlendHints.sphericalPosition);
    expect(state.transition.angle.delta).toBeNaN();
  });
});
