import { quat, vec3, vec4, type Quat, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as mixing from '../../../src/core/groups/mixing';
import { BlendHints } from '../../../src/core/blend/BlendHints';
import type { CameraState } from '../../../src/core/cameraState';
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
  const wrote = mixing.mix(
    out,
    mixing.createState(),
    mixing.createParams({ weights }),
    new Map(Object.entries(cameras)),
  );
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

  describe('round a shared target with sphericalPosition', () => {
    const orbiting = (degrees: number): MixedCamera => {
      const state = cameraState.create();
      const radians = (degrees * Math.PI) / 180;
      vec3.set(state.position, Math.sin(radians) * 10, 0, Math.cos(radians) * 10);
      state.hasTarget = true;
      return { state, hints: BlendHints.sphericalPosition };
    };
    const bearing = ({ position }: CameraState) => Math.atan2(position[0], position[2]);

    it('keeps each step of the mix turning the same way while the cameras circle apart', () => {
      const state = mixing.createState();
      const params = mixing.createParams({ weights: { a: 1, b: 1 } });
      const out = cameraState.create();
      let previous = 0;
      // The cameras turn opposite ways, so halfway between them holds still once they pass half a turn apart.
      for (let degrees = 10; degrees <= 170; degrees += 10) {
        mixing.mix(
          out,
          state,
          params,
          new Map([
            ['a', orbiting(degrees)],
            ['b', orbiting(-degrees)],
          ]),
        );
        const step = Math.abs(Math.atan2(Math.sin(bearing(out) - previous), Math.cos(bearing(out) - previous)));
        expect(step).toBeLessThan(1e-9);
        previous = bearing(out);
      }
    });

    it('arcs around up, giving the y-up mix turned onto it', () => {
      const toZUp = quat.rotationTo(quat.create(), [0, 1, 0], [0, 0, 1]);
      const at = (position: Vec3, turn: Quat): MixedCamera => {
        const state = cameraState.create();
        vec3.transformQuat(state.position, position, turn);
        state.hasTarget = true;
        return { state, hints: BlendHints.cylindricalPosition };
      };
      const mixAt = (turn: Quat, up?: Vec3) => {
        const out = cameraState.create();
        const cameras = new Map([
          ['a', at([8, 1, 3], turn)],
          ['b', at([-2, 4, 6], turn)],
        ]);
        mixing.mix(out, mixing.createState(), mixing.createParams({ weights: { a: 1, b: 2 } }), cameras, up);
        return out.position;
      };
      const expected = vec3.transformQuat(vec3.create(), mixAt(quat.create()), toZUp);
      const turned = mixAt(toZUp, [0, 0, 1]);
      for (let i = 0; i < 3; i++) expect(turned[i]).toBeCloseTo(expected[i], 9);
    });

    it('starts a step over once the cameras before it change', () => {
      const state = mixing.createState();
      const out = cameraState.create();
      const cameras = new Map([
        ['a', orbiting(0)],
        ['b', orbiting(100)],
        ['c', orbiting(200)],
      ]);
      mixing.mix(out, state, mixing.createParams({ weights: { a: 1, b: 1 } }), cameras);
      expect(state.angles[1].delta).not.toBeNaN();
      state.angles[1].delta = 3;
      mixing.mix(out, state, mixing.createParams({ weights: { c: 1, b: 1 } }), cameras);
      expect(state.order).toEqual(['c', 'b']);
      expect(Math.abs(state.angles[1].delta)).toBeLessThan(Math.PI);
    });
  });

  it('names the camera with the highest weight as dominant, the first one on a tie', () => {
    const cameras = new Map(Object.entries({ a: camera(0, 50), b: camera(0, 50) }));
    expect(mixing.dominant(mixing.createParams({ weights: { a: 1, b: 2 } }), cameras)).toBe('b');
    expect(mixing.dominant(mixing.createParams({ weights: { a: 2, b: 2 } }), cameras)).toBe('a');
    expect(mixing.dominant(mixing.createParams({ weights: { a: 0, missing: 9 } }), cameras)).toBeNull();
  });
});
