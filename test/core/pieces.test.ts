import { quat, vec3 } from 'math';
import { describe, expect, it } from 'vitest';
import type { CameraState } from '../../src/core/CameraState';
import * as cameraState from '../../src/core/CameraState';
import { HardLookAtAim } from '../../src/core/aim/HardLookAtAim';
import { PanTiltAim } from '../../src/core/aim/PanTiltAim';
import { RotateWithFollowTargetAim } from '../../src/core/aim/RotateWithFollowTargetAim';
import { RotationComposerAim } from '../../src/core/aim/RotationComposerAim';
import { FollowBody } from '../../src/core/body/FollowBody';
import { HardLockToTargetBody } from '../../src/core/body/HardLockToTargetBody';
import { PositionComposerBody } from '../../src/core/body/PositionComposerBody';
import { GroupFramingExtension } from '../../src/core/extension/GroupFramingExtension';
import * as targetPose from '../../src/core/TargetPose';
import * as panTilt from '../../src/core/aim/panTilt';
import * as hardLookAt from '../../src/core/aim/hardLookAt';
import * as rotateWithFollowTarget from '../../src/core/aim/rotateWithFollowTarget';
import * as rotationComposer from '../../src/core/aim/rotationComposer';
import * as follow from '../../src/core/body/follow';
import * as hardLockToTarget from '../../src/core/body/hardLockToTarget';
import * as positionComposer from '../../src/core/body/positionComposer';
import * as groupFraming from '../../src/core/extension/groupFraming';

type Step = (out: CameraState, dt: number, justActivated: boolean) => unknown;
type Pose = ReturnType<typeof targetPose.create>;

/** Runs a piece and its function side by side on one pose that moves and turns every frame. */
function expectSameAs(piece: (pose: Pose) => { update: Step }, fn: (pose: Pose) => Step) {
  const pose = targetPose.create();
  pose.hasRotation = true;
  pose.extent.radius = 0.5;
  const a = { out: cameraState.create(), step: piece(pose).update };
  const b = { out: cameraState.create(), step: fn(pose) };
  vec3.set(a.out.position, 0, 2, 15);
  vec3.set(b.out.position, 0, 2, 15);
  for (let i = 0; i < 30; i++) {
    vec3.set(pose.position, Math.sin(i * 0.2) * 4, 0, -i * 0.3);
    quat.setAxisAngle(pose.rotation, [0, 1, 0], i * 0.1);
    a.step(a.out, 1 / 60, i === 0);
    b.step(b.out, 1 / 60, i === 0);
    expect(a.out).toEqual(b.out);
  }
}

const damped = { damping: 0.3 };
const composed = { damping: 0.3, deadZone: [0.1, 0.1] as [number, number] };

describe('core pieces', () => {
  it('match their functions step for step on a TargetPose the caller updates', () => {
    expectSameAs(
      (pose) => new HardLockToTargetBody(pose, damped),
      (pose) => {
        const state = hardLockToTarget.createState();
        const params = hardLockToTarget.createParams(damped);
        return (out, dt, ja) => hardLockToTarget.update(out, state, params, pose.position, dt, ja);
      },
    );
    expectSameAs(
      (pose) => new FollowBody(pose, damped),
      (pose) => {
        const state = follow.createState();
        const params = follow.createParams(damped);
        return (out, dt, ja) => follow.update(out, state, params, pose, dt, ja);
      },
    );
    expectSameAs(
      (pose) => new PositionComposerBody(pose, composed),
      (pose) => {
        const state = positionComposer.createState();
        const params = positionComposer.createParams(composed);
        return (out, dt, ja) => positionComposer.update(out, state, params, pose, dt, ja);
      },
    );
    expectSameAs(
      (pose) => new HardLookAtAim(pose),
      (pose) => (out) => hardLookAt.update(out, pose.position),
    );
    expectSameAs(
      (pose) => new RotateWithFollowTargetAim(pose, damped),
      (pose) => {
        const state = rotateWithFollowTarget.createState();
        const params = rotateWithFollowTarget.createParams(damped);
        return (out, dt, ja) => rotateWithFollowTarget.update(out, state, params, pose.rotation, dt, ja);
      },
    );
    expectSameAs(
      (pose) => new RotationComposerAim(pose, composed),
      (pose) => {
        const state = rotationComposer.createState();
        const params = rotationComposer.createParams(composed);
        return (out, dt, ja) => rotationComposer.update(out, state, params, pose, dt, ja);
      },
    );
    expectSameAs(
      (pose) => {
        const aim = new PanTiltAim(pose);
        aim.pan.applyDelta(30);
        return aim;
      },
      (pose) => {
        const state = panTilt.createState();
        state.pan.applyDelta(30);
        return (out, dt) => panTilt.update(out, state, pose.rotation, dt);
      },
    );
  });

  it('GroupFramingExtension matches groupFraming.update on new members the caller updates', () => {
    const members = [groupFraming.createMember(), groupFraming.createMember()];
    members.forEach((member, i) => {
      vec3.set(member.position, i * 4 - 2, 0, -10);
      member.extent.radius = 1;
    });
    const options = { damping: 0.3, viewportWidth: 800, viewportHeight: 600 };
    const extension = new GroupFramingExtension(members, 'groupAverage', options);
    const state = groupFraming.createState();
    const params = groupFraming.createParams(options);
    const a = cameraState.create();
    const b = cameraState.create();

    for (let i = 0; i < 20; i++) {
      members[1].position[0] = 2 + i * 0.5;
      extension.update(a, 1 / 60, i === 0);
      groupFraming.update(b, state, params, members, 'groupAverage', 1 / 60, i === 0);
      expect(a).toEqual(b);
    }
    expect(a.position[2]).toBeGreaterThan(0);
  });
});
