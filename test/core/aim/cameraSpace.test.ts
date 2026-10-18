import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraSpace from '../../../src/core/aim/cameraSpace';

const yaw = (degrees: number) => quat.setAxisAngle(quat.create(), [0, 1, 0], (degrees * Math.PI) / 180);

describe('cameraSpace', () => {
  it('puts a world point in the space of the camera: x right, y up, looking down -z', () => {
    const out: Vec3 = [0, 0, 0];
    cameraSpace.fromWorld(out, [1, 0, 0], yaw(90), [0, 2, 0]);
    expect(out[0]).toBeCloseTo(0, 10);
    expect(out[1]).toBeCloseTo(2, 10);
    expect(out[2]).toBeCloseTo(-1, 10);
  });

  it('turns a rotation looking at a point so the point lies along the given direction', () => {
    const point: Vec3 = [0, 0, -5];
    const rotation = cameraSpace.rotateToDirection(quat.create(), quat.create(), [1, 0.5, -2]);

    const local = vec3.normalize(vec3.create(), cameraSpace.fromWorld(vec3.create(), [0, 0, 0], rotation, point));
    const expected = vec3.normalize(vec3.create(), [1, 0.5, -2]);
    for (let i = 0; i < 3; i++) expect(local[i]).toBeCloseTo(expected[i], 10);
  });
});
