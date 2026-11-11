import { quat, vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as hardLookAt from '../../../src/core/aim/hardLookAt';
import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { RotationComposerAim } from '../../../src/core/aim/RotationComposerAim';

import { maxTurnWhileStrafing } from './strafing';

describe('RotationComposerAim', () => {
  it("composes the Body's tracked point with lookAt: 'body', so a damped Body moves the camera without turning it", () => {
    const pose = targetPose.create();
    expect(maxTurnWhileStrafing(pose, new RotationComposerAim(pose).update)).toBeGreaterThan(0.01);
    expect(maxTurnWhileStrafing(pose, new RotationComposerAim(null, { lookAt: 'body' }).update)).toBeLessThan(1e-9);
  });

  it("applies targetOffset in the target's rotation around the Body's tracked point, leaving the target as is", () => {
    const pose = targetPose.create();
    vec3.set(pose.position, 50, 0, 0);
    quat.setAxisAngle(pose.rotation, [0, 1, 0], Math.PI / 2);
    pose.hasRotation = true;
    const out = cameraState.create();
    vec3.set(out.position, 0, 0, 10);
    out.hasTarget = true;
    new RotationComposerAim(pose, { lookAt: 'body', targetOffset: [1, 0, 0] }).update(out, 1 / 60, true);

    const expected = cameraState.create();
    vec3.set(expected.position, 0, 0, 10);
    hardLookAt.update(expected, [0, 0, -1]);
    expect(quat.getAngle(out.quaternion, expected.quaternion)).toBeLessThan(1e-6);
    expect(pose.position).toEqual([50, 0, 0]);
  });

  it("leaves the rotation as is with lookAt: 'body' when the Body has no target", () => {
    const out = cameraState.create();
    quat.setAxisAngle(out.quaternion, [0, 1, 0], 0.5);
    const before = quat.clone(out.quaternion);
    new RotationComposerAim(targetPose.create(), { lookAt: 'body' }).update(out, 1 / 60, true);
    expect(out.quaternion).toEqual(before);
  });
});
