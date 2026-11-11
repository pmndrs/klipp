import { quat, vec3 } from 'math';

import * as cameraState from '../../../src/core/cameraState';
import { OrbitFollowBody } from '../../../src/core/body/OrbitFollowBody';
import type { CameraState } from '../../../src/core/cameraState';
import type { TargetPose } from '../../../src/core/targetPose';

type Step = (out: CameraState, dt: number, justActivated: boolean) => void;

/** Strafes `pose` sideways under a damped Body and returns the camera's largest turn from its first frame. */
export function maxTurnWhileStrafing(
  pose: TargetPose,
  aim: Step,
  body: { update: Step } = new OrbitFollowBody(pose, { damping: 0.5 }),
) {
  const out = cameraState.create();
  const first = quat.create();
  let maxTurn = 0;
  for (let i = 0; i < 60; i++) {
    vec3.set(pose.position, i * 0.1, 0, 0);
    body.update(out, 1 / 60, i === 0);
    aim(out, 1 / 60, i === 0);
    if (i === 0) quat.copy(first, out.quaternion);
    maxTurn = Math.max(maxTurn, quat.getAngle(first, out.quaternion));
  }
  return maxTurn;
}
