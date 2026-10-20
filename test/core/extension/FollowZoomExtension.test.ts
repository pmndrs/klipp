import { vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { FollowZoomExtension, type FollowZoomOptions } from '../../../src/core/extension/FollowZoomExtension';

const degrees = (radians: number) => (radians * 180) / Math.PI;

function zoomed(distance: number, options: FollowZoomOptions) {
  const target = targetPose.create();
  vec3.set(target.position, 0, 0, -distance);
  const extension = new FollowZoomExtension(target, { damping: 0, ...options });
  const out = cameraState.create();
  extension.update(out, 0.1, true);
  return { out, extension, target };
}

describe('FollowZoomExtension', () => {
  it('sets the field of view that makes the shot `width` wide at the target, for the viewport aspect', () => {
    expect(zoomed(10, { width: 4 }).out.fov).toBeCloseTo(degrees(2 * Math.atan(0.2)), 10);
    expect(zoomed(10, { width: 4, aspect: 2 }).out.fov).toBeCloseTo(degrees(2 * Math.atan(0.1)), 10);
  });

  it('stays within fovRange', () => {
    expect(zoomed(10, { width: 1000, fovRange: [10, 40] }).out.fov).toBe(40);
    expect(zoomed(10, { width: 0.001, fovRange: [10, 40] }).out.fov).toBe(10);
  });

  it('eases to a new field of view with damping, and starts there at once on activation', () => {
    const { out, extension, target } = zoomed(10, { width: 4, damping: 1 });
    const first = out.fov;
    expect(first).toBeCloseTo(degrees(2 * Math.atan(0.2)), 10);

    vec3.set(target.position, 0, 0, -20);
    extension.update(out, 0.1, false);
    expect(out.fov).toBeLessThan(first);
    expect(out.fov).toBeGreaterThan(degrees(2 * Math.atan(0.1)));
  });

  it('leaves the field of view alone without a target', () => {
    const out = cameraState.create();
    new FollowZoomExtension(null).update(out, 0.1, true);
    expect(out.fov).toBe(50);
  });

  it('runs before the Aim, so composers frame with its field of view', () => {
    expect(new FollowZoomExtension(null).applyAfter).toBe('body');
  });
});
