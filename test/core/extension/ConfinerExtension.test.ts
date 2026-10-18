import { vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { HardLookAtAim } from '../../../src/core/aim/HardLookAtAim';
import { HardLockToTargetBody } from '../../../src/core/body/HardLockToTargetBody';
import type { ConfinerBounds } from '../../../src/core/extension/confiner';
import { ConfinerExtension, type ConfinerOptions } from '../../../src/core/extension/ConfinerExtension';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

const box: ConfinerBounds = [-5, -5, -5, 5, 5, 5];

const pose = (position: Vec3) => {
  const out = targetPose.create();
  vec3.copy(out.position, position);
  return out;
};

function confined(bounds: ConfinerBounds | null, position: Vec3, options?: ConfinerOptions) {
  const out = cameraState.create();
  vec3.copy(out.position, position);
  new ConfinerExtension(bounds, options).update(out);
  return out.position;
}

const expectClose = (actual: ArrayLike<number>, expected: ArrayLike<number>) => {
  for (let i = 0; i < expected.length; i++) expect(actual[i]).toBeCloseTo(expected[i], 10);
};

describe('ConfinerExtension', () => {
  it('leaves a camera inside alone, and moves one outside to the closest point of a box or a sphere', () => {
    expectClose(confined(box, [1, 2, 3]), [1, 2, 3]);
    expectClose(confined(box, [9, 2, -8]), [5, 2, -5]);
    expectClose(confined({ center: [0, 0, 0], radius: 5 }, [0, 3, 4]), [0, 3, 4]);
    expectClose(confined({ center: [1, 0, 0], radius: 5 }, [1, 6, 8]), [1, 3, 4]);
    expectClose(confined(null, [9, 9, 9]), [9, 9, 9]);
  });

  it('keeps a damped Body exactly at the edge while its target is outside, without building up', () => {
    const klipp = new Klipp();
    const camera = new VirtualCamera('a');
    camera.body = new HardLockToTargetBody(pose([20, 0, 0]), { damping: 0.5 });
    camera.addExtension(new ConfinerExtension(box));
    klipp.add(camera);
    for (let i = 0; i < 300; i++) klipp.update(1 / 60);

    expectClose(camera.state.position, [5, 0, 0]);
  });

  it('runs before the Aim, so the Aim looks from where the camera ends up', () => {
    const klipp = new Klipp();
    const camera = new VirtualCamera('a');
    camera.body = new HardLockToTargetBody(pose([20, 0, 0]));
    camera.aim = new HardLookAtAim(pose([0, 0, -10]));
    camera.addExtension(new ConfinerExtension(box));
    klipp.add(camera);
    klipp.update(1 / 60);

    const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], camera.state.quaternion);
    expectClose(forward, vec3.normalize(vec3.create(), [-5, 0, -10]));
  });

  it('eases into the edge over slowingDistance, moving less the farther it is pushed, never past the edge', () => {
    const x = (position: number) => confined(box, [position, 0, 0], { slowingDistance: 2 })[0];
    expect(x(2.5)).toBe(2.5);
    expect(x(3.001)).toBeCloseTo(3.001, 6);
    expect(x(4)).toBeCloseTo(3 + 2 * Math.tanh(0.5), 10);
    expect(x(6)).toBeLessThan(5);
    expect(x(100)).toBeLessThanOrEqual(5);

    const sphere = { center: [0, 0, 0] as Vec3, radius: 5 };
    expectClose(confined(sphere, [0, 4, 0], { slowingDistance: 2 }), [0, 3 + 2 * Math.tanh(0.5), 0]);
  });
});
