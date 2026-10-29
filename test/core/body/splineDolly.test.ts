import type { Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as splineDolly from '../../../src/core/body/splineDolly';
import * as cameraState from '../../../src/core/cameraState';
import * as spline from '../../../src/core/spline';
import { BlendCurves } from '../../../src/core/blend/BlendCurves';
import type { SplineDollyParams } from '../../../src/core/body/splineDolly';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 6);
};

const line = spline.create([
  [0, 0, 0],
  [1, 0, 0],
  [2, 0, 0],
  [3, 0, 0],
  [4, 0, 0],
]);
const square = spline.create(
  [
    [0, 0, 0],
    [4, 0, 0],
    [4, 0, 4],
    [0, 0, 4],
  ],
  true,
);

function run(params: SplineDollyParams, frames = 1, dt = 1 / 60) {
  const out = cameraState.create();
  const state = splineDolly.createState();
  for (let i = 0; i < frames; i++) splineDolly.update(out, state, params, null, dt, i === 0);
  return { out, state };
}

describe('splineDolly.update', () => {
  it('leaves the camera where it is without a path', () => {
    const out = cameraState.create();
    out.position = [1, 2, 3];
    splineDolly.update(out, splineDolly.createState(), splineDolly.createParams(), null, 1 / 60, true);
    expect(out.position).toEqual([1, 2, 3]);
  });

  it('puts the camera at its position in any units', () => {
    expectVec3(run(splineDolly.createParams({ spline: line, position: 0.5 })).out.position, [2, 0, 0]);
    expectVec3(
      run(splineDolly.createParams({ spline: line, position: 3, positionUnits: 'knot' })).out.position,
      [3, 0, 0],
    );
    expectVec3(
      run(splineDolly.createParams({ spline: line, position: 1.5, positionUnits: 'distance' })).out.position,
      [1.5, 0, 0],
    );
  });

  it('offsets the camera to the side, up and along the path', () => {
    const params = splineDolly.createParams({ spline: line, position: 0.25, splineOffset: [1, 2, 0.5] });
    expectVec3(run(params).out.position, [1.5, 2, 1]);
  });

  it('still offsets the camera along a path that goes straight up', () => {
    const shaft = spline.create([
      [0, 0, 0],
      [0, 5, 0],
    ]);
    const { out } = run(splineDolly.createParams({ spline: shaft, position: 0.5, splineOffset: [1, 1, 0] }));
    expectVec3(out.position, [1, 2.5, 1]);
  });

  it('snaps on activation, then travels toward a new position with damping', () => {
    const params = splineDolly.createParams({ spline: line, position: 0, damping: 0.5 });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 1 / 60, true);
    expectVec3(out.position, [0, 0, 0]);

    params.position = 1;
    splineDolly.update(out, state, params, null, 1 / 60, false);
    expect(out.position[0]).toBeGreaterThan(0);
    expect(out.position[0]).toBeLessThan(0.5);
    for (let i = 0; i < 300; i++) splineDolly.update(out, state, params, null, 1 / 60, false);
    expectVec3(out.position, [4, 0, 0]);

    params.position = 0;
    splineDolly.update(out, state, params, null, 1 / 60, true);
    expectVec3(out.position, [0, 0, 0]);
  });

  it('travels a closed path the way its position changes, the long way round too', () => {
    const params = splineDolly.createParams({ spline: square, position: 0.1, damping: 0.5 });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 1 / 60, true);

    params.position = 0.9;
    for (let i = 0; i < 300; i++) {
      splineDolly.update(out, state, params, null, 1 / 60, false);
      const normalized = state.distance / square.length;
      expect(normalized).toBeGreaterThan(0.099);
      expect(normalized).toBeLessThan(0.901);
    }
    expect(state.distance / square.length).toBeCloseTo(0.9, 4);
  });

  it('laps a closed path past its end, crossing the seam forward', () => {
    const params = splineDolly.createParams({ spline: square, position: 0.9, damping: 0.5 });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 1 / 60, true);

    params.position = 1.05;
    for (let i = 0; i < 300; i++) {
      splineDolly.update(out, state, params, null, 1 / 60, false);
      const normalized = state.distance / square.length;
      expect(normalized > 0.899 || normalized < 0.051).toBe(true);
    }
    expect(state.distance / square.length).toBeCloseTo(0.05, 4);
  });

  it('puts a lapped position on the same point in any units', () => {
    const at = (position: number, positionUnits: 'normalized' | 'knot') =>
      run(splineDolly.createParams({ spline: square, position, positionUnits })).out.position;
    expectVec3(at(2.5, 'knot'), at(6.5, 'knot'));
    expectVec3(at(0.3, 'normalized'), at(-0.7, 'normalized'));
  });
});

describe('splineDolly.prime', () => {
  it('starts the next activation from the point of the path nearest to a position', () => {
    const params = splineDolly.createParams({ spline: line, position: 0, damping: 1 });
    const state = splineDolly.createState();
    splineDolly.prime(state, params, [3, 2, 0]);
    const out = cameraState.create();
    splineDolly.update(out, state, params, null, 1 / 60, true);
    expect(out.position[0]).toBeGreaterThan(2.9);
    expect(out.position[0]).toBeLessThan(3);
  });
});

/** Runs `frames` frames after an activation frame, each `dt` long. */
function runFor(params: SplineDollyParams, frames: number, dt = 0.1) {
  const out = cameraState.create();
  const state = splineDolly.createState();
  splineDolly.update(out, state, params, null, dt, true);
  for (let i = 0; i < frames; i++) splineDolly.update(out, state, params, null, dt, false);
  return { out, state };
}

describe('splineDolly automaticDolly: fixedSpeed', () => {
  it('moves by speed positions per second and stops at the end of an open path', () => {
    const params = splineDolly.createParams({
      spline: line,
      positionUnits: 'distance',
      automaticDolly: { method: 'fixedSpeed', speed: 2 },
    });
    expect(runFor(params, 10).state.position).toBeCloseTo(2, 9);
    expectVec3(runFor(params, 50).out.position, [4, 0, 0]);
  });

  it('starts from position on each activation, and moves on regardless of it in between', () => {
    const params = splineDolly.createParams({
      spline: line,
      position: 0.2,
      automaticDolly: { method: 'fixedSpeed', speed: 0.1 },
    });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 1, true);
    expect(state.position).toBe(0.2);
    params.position = 0.5;
    splineDolly.update(out, state, params, null, 1, false);
    expect(state.position).toBeCloseTo(0.3, 9);

    splineDolly.startOver(state, params);
    splineDolly.update(out, state, params, null, 1, false);
    expect(state.position).toBe(0.5);
    splineDolly.update(out, state, params, null, 1, true);
    expect(state.position).toBe(0.5);
  });

  it('laps a closed path forward, keeping the damped camera moving forward across the seam', () => {
    const params = splineDolly.createParams({
      spline: square,
      position: 0.8,
      damping: 0.5,
      automaticDolly: { method: 'fixedSpeed', speed: 0.2 },
    });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 0.1, true);
    let previous = state.distance;
    for (let i = 0; i < 30; i++) {
      splineDolly.update(out, state, params, null, 0.1, false);
      const step = (state.distance - previous + square.length) % square.length;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(1);
      previous = state.distance;
    }
    expect(state.position).toBeGreaterThanOrEqual(0);
    expect(state.position).toBeLessThan(1);
    expect(state.damper.value).toBeLessThan(square.length * 2);
  });
});

describe('splineDolly automaticDolly: duration', () => {
  const move = (settings: Partial<Extract<SplineDollyParams['automaticDolly'], { method: 'duration' }>> = {}) =>
    splineDolly.createParams({
      spline: line,
      positionUnits: 'distance',
      automaticDolly: { method: 'duration', from: 1, to: 3, duration: 2, ...settings },
    });

  it('moves from from to to in duration seconds, then stays', () => {
    expect(runFor(move(), 0).state.position).toBe(1);
    expect(runFor(move(), 10).state.position).toBeCloseTo(2, 9);
    expect(runFor(move(), 20).state.position).toBeCloseTo(3, 9);
    expect(runFor(move(), 40).state.position).toBeCloseTo(3, 9);
  });

  it('eases along its curve', () => {
    expect(runFor(move({ curve: (t) => t * t }), 10).state.position).toBeCloseTo(1.5, 9);
  });

  it('starts over, or turns back, with loop and pingPong', () => {
    expect(runFor(move({ loop: 'loop' }), 25).state.position).toBeCloseTo(1.5, 9);
    expect(runFor(move({ loop: 'pingPong' }), 25).state.position).toBeCloseTo(2.5, 9);
    expect(runFor(move({ loop: 'pingPong' }), 40).state.position).toBeCloseTo(1, 9);
  });

  it('starts over from from on each activation', () => {
    const params = move();
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 0.5, true);
    splineDolly.update(out, state, params, null, 0.5, false);
    expect(state.position).toBeCloseTo(1.5, 9);
    splineDolly.update(out, state, params, null, 0.5, true);
    expect(state.position).toBe(1);
  });

  it('starts over from from, without easing back, when its camera becomes active again', () => {
    const params = move();
    params.damping = 1;
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 1, true);
    for (let i = 0; i < 5; i++) splineDolly.update(out, state, params, null, 1, false);
    splineDolly.startOver(state, params);
    splineDolly.update(out, state, params, null, 1, false);
    expect(state.position).toBe(1);
    expectVec3(out.position, [1, 0, 0]);
  });

  it('leaves a nearestPointToTarget dolly as it is', () => {
    const params = splineDolly.createParams({ spline: line, automaticDolly: { method: 'nearestPointToTarget' } });
    const { state } = runFor(params, 2, 1);
    splineDolly.startOver(state, params);
    expect(state.startOver).toBe(false);
  });

  it('keeps the damped camera moving forward when a full lap of a closed path starts over', () => {
    const params = splineDolly.createParams({
      spline: square,
      damping: 0.5,
      automaticDolly: { method: 'duration', from: 0, to: 1, duration: 2, loop: 'loop' },
    });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, null, 0.1, true);
    let previous = state.distance;
    for (let i = 0; i < 50; i++) {
      splineDolly.update(out, state, params, null, 0.1, false);
      const step = (state.distance - previous + square.length) % square.length;
      expect(step).toBeLessThan(2);
      previous = state.distance;
    }
  });
});

describe('splineDolly automaticDolly: nearestPointToTarget', () => {
  it('heads for the point of the path nearest the target, positionOffset further on', () => {
    const params = splineDolly.createParams({ spline: line, automaticDolly: { method: 'nearestPointToTarget' } });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, [2.5, 3, 1], 0.1, true);
    expect(state.position).toBeCloseTo(0.625, 3);
    expectVec3(out.position.map((v) => Number(v.toFixed(2))) as Vec3, [2.5, 0, 0]);
    expect(out.target).toEqual([2.5, 3, 1]);
    expect(out.hasTarget).toBe(true);

    params.positionUnits = 'distance';
    params.automaticDolly = { method: 'nearestPointToTarget', positionOffset: 1 };
    splineDolly.update(out, state, params, [2.5, 3, 1], 0.1, true);
    expect(state.position).toBeCloseTo(3.5, 2);
  });

  it('stays put without a target', () => {
    const params = splineDolly.createParams({
      spline: line,
      position: 0.5,
      automaticDolly: { method: 'nearestPointToTarget' },
    });
    const out = cameraState.create();
    const state = splineDolly.createState();
    splineDolly.update(out, state, params, [1, 0, 0], 0.1, true);
    splineDolly.update(out, state, params, null, 0.1, false);
    expect(state.position).toBeCloseTo(0.25, 3);
    expect(out.hasTarget).toBe(true);
  });

  it('follows a target around a closed path and across its seam the short way', () => {
    const params = splineDolly.createParams({
      spline: square,
      damping: 0.3,
      automaticDolly: { method: 'nearestPointToTarget' },
    });
    const out = cameraState.create();
    const state = splineDolly.createState();
    // Walks the target once and a half round the square's edges, just outside it.
    const around = (t: number): Vec3 => {
      const edge = Math.floor(t) % 4;
      const f = t - Math.floor(t);
      if (edge === 0) return [4 * f, 0, -1];
      if (edge === 1) return [5, 0, 4 * f];
      if (edge === 2) return [4 - 4 * f, 0, 5];
      return [-1, 0, 4 - 4 * f];
    };
    splineDolly.update(out, state, params, around(3), 0.05, true);
    let previous = state.distance;
    for (let t = 3; t < 6; t += 0.05) {
      splineDolly.update(out, state, params, around(t), 0.05, false);
      const step = (state.distance - previous + square.length) % square.length;
      expect(step).toBeLessThan(1);
      previous = state.distance;
    }
    expect(state.position).toBeGreaterThanOrEqual(0);
    expect(state.position).toBeLessThan(1);
  });
});

describe('splineDolly automaticDolly: none', () => {
  it('goes back to position once the automatic dolly is turned off', () => {
    const params = splineDolly.createParams({
      spline: line,
      position: 0.25,
      automaticDolly: { method: 'fixedSpeed', speed: 0.1 },
    });
    const { out, state } = runFor(params, 3, 1);
    expect(state.position).toBeCloseTo(0.55, 9);
    params.automaticDolly = null;
    splineDolly.update(out, state, params, null, 1, false);
    expect(state.position).toBe(0.25);
  });
});

describe('splineDolly.update return value', () => {
  const step = (params: SplineDollyParams, frames: number, dt = 0.5) => {
    const out = cameraState.create();
    const state = splineDolly.createState();
    const moving = [splineDolly.update(out, state, params, null, dt, true)];
    for (let i = 0; i < frames; i++) moving.push(splineDolly.update(out, state, params, null, dt, false));
    return moving;
  };

  it('is true while a duration move runs, even where its curve stands still, and false once it ends', () => {
    const params = splineDolly.createParams({
      spline: line,
      automaticDolly: { method: 'duration', from: 0, to: 1, duration: 1, curve: BlendCurves.cut },
    });
    expect(step(params, 3)).toEqual([true, true, false, false]);
  });

  it('is true while a fixedSpeed dolly moves, and false once it reaches the end of an open path', () => {
    const params = splineDolly.createParams({ spline: line, automaticDolly: { method: 'fixedSpeed', speed: 1 } });
    expect(step(params, 3)).toEqual([true, true, false, false]);
  });

  it('is false without an automatic dolly', () => {
    expect(step(splineDolly.createParams({ spline: line, position: 0.5 }), 1)).toEqual([false, false]);
  });
});

describe('splineDolly.prime on a closed path', () => {
  it('glides to its position the short way round from the point nearest the camera', () => {
    const params = splineDolly.createParams({ spline: square, position: 0.95, damping: 0.5 });
    const state = splineDolly.createState();
    splineDolly.prime(state, params, [0.3, 0, -1]);
    const out = cameraState.create();
    splineDolly.update(out, state, params, null, 1 / 60, true);
    for (let i = 0; i < 300; i++) {
      const normalized = state.distance / square.length;
      expect(normalized < 0.1 || normalized > 0.9).toBe(true);
      splineDolly.update(out, state, params, null, 1 / 60, false);
    }
    expect(state.distance / square.length).toBeCloseTo(0.95, 3);
  });
});
