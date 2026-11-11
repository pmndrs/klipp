import { quat, vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { HardLookAtAim } from '../../../src/core/aim/HardLookAtAim';
import { FollowBody } from '../../../src/core/body/FollowBody';

import { maxTurnWhileStrafing } from './strafing';

describe('HardLookAtAim', () => {
  it("looks at the Body's tracked point with lookAt: 'body', so a damped Body moves the camera without turning it", () => {
    const pose = targetPose.create();
    expect(maxTurnWhileStrafing(pose, new HardLookAtAim(pose).update)).toBeGreaterThan(0.01);
    expect(maxTurnWhileStrafing(pose, new HardLookAtAim(null, { lookAt: 'body' }).update)).toBeLessThan(1e-9);
  });

  it('does the same under a damped Follow', () => {
    const pose = targetPose.create();
    const aim = new HardLookAtAim(null, { lookAt: 'body' });
    expect(maxTurnWhileStrafing(pose, aim.update, new FollowBody(pose, { damping: 0.5 }))).toBeLessThan(1e-9);
  });

  it("publishes the Body's tracked point as the look-at target", () => {
    const out = cameraState.create();
    vec3.set(out.position, 0, 0, 10);
    vec3.set(out.target, 1, 2, 3);
    out.hasTarget = true;
    new HardLookAtAim(null, { lookAt: 'body' }).update(out);
    expect(out.lookAtTarget).toEqual([1, 2, 3]);
    expect(out.hasLookAtTarget).toBe(true);
  });

  it("leaves the rotation as is with lookAt: 'body' when the Body has no target", () => {
    const out = cameraState.create();
    quat.setAxisAngle(out.quaternion, [0, 1, 0], 0.5);
    const before = quat.clone(out.quaternion);
    new HardLookAtAim(targetPose.create(), { lookAt: 'body' }).update(out);
    expect(out.quaternion).toEqual(before);
    expect(out.hasLookAtTarget).toBe(false);
  });
});
