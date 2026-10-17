import { vec3, vec4 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as mixing from '../../../src/core/groups/mixing';
import type { MixedCamera } from '../../../src/core/groups/mixing';

import { yaw } from '../mathHelpers';

function camera(x: number, fov: number, angleDegrees = 0): MixedCamera {
  const state = cameraState.create();
  vec3.set(state.position, x, 0, 0);
  state.fov = fov;
  vec4.copy(state.quaternion, yaw(angleDegrees));
  return { state };
}

const mixed = (weights: Record<string, number>, cameras: Record<string, MixedCamera>) => {
  const out = cameraState.create();
  const wrote = mixing.mix(out, mixing.createParams({ weights }), new Map(Object.entries(cameras)));
  return { out, wrote };
};

describe('mixing', () => {
  it('takes the only weighted camera exactly', () => {
    const { out } = mixed({ a: 1 }, { a: camera(5, 60) });
    expect(out.position[0]).toBe(5);
    expect(out.fov).toBe(60);
  });

  it('averages by weight, rotation included', () => {
    const even = mixed({ a: 0.5, b: 0.5 }, { a: camera(0, 40, 0), b: camera(10, 60, 90) }).out;
    expect(even.position[0]).toBeCloseTo(5, 10);
    expect(even.fov).toBeCloseTo(50, 10);
    for (let i = 0; i < 4; i++) expect(even.quaternion[i]).toBeCloseTo(yaw(45)[i], 10);

    const uneven = mixed({ a: 3, b: 1 }, { a: camera(0, 0, 0), b: camera(100, 0, 90) }).out;
    expect(uneven.position[0]).toBeCloseTo(25, 10);
    for (let i = 0; i < 4; i++) expect(uneven.quaternion[i]).toBeCloseTo(yaw(22.5)[i], 10);
  });

  it('leaves out cameras with no positive weight, and names with no camera', () => {
    const { out } = mixed(
      { a: 2, b: 0, c: -1, missing: 5 },
      { a: camera(10, 50), b: camera(999, 999), c: camera(999, 999) },
    );
    expect(out.position[0]).toBe(10);
    expect(out.fov).toBe(50);
  });

  it('leaves out as it is while no weight is positive', () => {
    const { out, wrote } = mixed({ a: 0 }, { a: camera(10, 50) });
    expect(wrote).toBe(false);
    expect(out).toEqual(cameraState.create());
  });

  it('names the camera with the highest weight as dominant, the first one on a tie', () => {
    const cameras = new Map(Object.entries({ a: camera(0, 50), b: camera(0, 50) }));
    expect(mixing.dominant(mixing.createParams({ weights: { a: 1, b: 2 } }), cameras)).toBe('b');
    expect(mixing.dominant(mixing.createParams({ weights: { a: 2, b: 2 } }), cameras)).toBe('a');
    expect(mixing.dominant(mixing.createParams({ weights: { a: 0, missing: 9 } }), cameras)).toBeNull();
  });
});
