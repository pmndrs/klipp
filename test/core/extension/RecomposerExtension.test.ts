import { vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import { PanTiltAim } from '../../../src/core/aim/PanTiltAim';
import { RecomposerExtension, type RecomposerOptions } from '../../../src/core/extension/RecomposerExtension';

const forward = (out: ReturnType<typeof cameraState.create>): Vec3 =>
  vec3.transformQuat(vec3.create(), [0, 0, -1], out.quaternion);
const up = (out: ReturnType<typeof cameraState.create>): Vec3 =>
  vec3.transformQuat(vec3.create(), [0, 1, 0], out.quaternion);

function recomposed(options: RecomposerOptions) {
  const out = cameraState.create();
  new RecomposerExtension(options).update(out);
  return out;
}

const expectClose = (actual: ArrayLike<number>, expected: ArrayLike<number>) => {
  for (let i = 0; i < expected.length; i++) expect(actual[i]).toBeCloseTo(expected[i], 10);
};

describe('RecomposerExtension', () => {
  it('pans and tilts the same way as PanTilt', () => {
    for (const [pan, tilt] of [
      [30, 0],
      [0, 20],
    ]) {
      const panTilt = cameraState.create();
      new PanTiltAim(null, { pan: { center: pan }, tilt: { center: tilt } }).update(panTilt, 0);
      expectClose(forward(recomposed({ pan, tilt })), forward(panTilt));
    }
    expect(forward(recomposed({ pan: 30 }))[0]).toBeGreaterThan(0);
    expect(forward(recomposed({ tilt: 20 }))[1]).toBeLessThan(0);
  });

  it("pans around referenceUp, toward the camera's right", () => {
    const out = cameraState.create();
    vec3.set(out.referenceUp, 1, 0, 0);
    new RecomposerExtension({ pan: 90 }).update(out);
    expectClose(forward(out), [0, -1, 0]);
  });

  it('rolls with dutch, leaning the camera to the right', () => {
    const out = recomposed({ dutch: 30 });
    expectClose(forward(out), [0, 0, -1]);
    expectClose(up(out), [Math.sin(Math.PI / 6), Math.cos(Math.PI / 6), 0]);
  });

  it('scales the field of view, never below a hundredth', () => {
    expect(recomposed({ zoomScale: 0.5 }).fov).toBe(25);
    expect(recomposed({ zoomScale: 0 }).fov).toBe(0.5);
  });

  it('leaves the shot alone by default', () => {
    expect(recomposed({})).toEqual(cameraState.create());
  });
});
