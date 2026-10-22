import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraSpace from '../../../src/core/aim/cameraSpace';
import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { HardLockToTargetBody } from '../../../src/core/body/HardLockToTargetBody';
import { CameraOffsetExtension } from '../../../src/core/extension/CameraOffsetExtension';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

const yaw = (degrees: number) => quat.setAxisAngle(quat.create(), [0, 1, 0], (degrees * Math.PI) / 180);

function lookingAt(target: Vec3) {
  const out = cameraState.create();
  vec3.copy(out.lookAtTarget, target);
  out.hasLookAtTarget = true;
  return out;
}

const expectClose = (actual: ArrayLike<number>, expected: ArrayLike<number>) => {
  for (let i = 0; i < expected.length; i++) expect(actual[i]).toBeCloseTo(expected[i], 10);
};

describe('CameraOffsetExtension', () => {
  it('moves the camera in its own space, and the look-at target with it', () => {
    const out = lookingAt([-10, 0, 0]);
    quat.copy(out.quaternion, yaw(90));
    new CameraOffsetExtension({ offset: [1, 2, 0] }).update(out);

    expectClose(out.position, [0, 2, -1]);
    expectClose(out.lookAtTarget, [-10, 2, -1]);
    expectClose(out.quaternion, yaw(90));
  });

  it('with preserveComposition, turns the camera so the look-at target keeps its place on screen', () => {
    const target: Vec3 = [2, 1, -10];
    const out = lookingAt(target);
    const before = vec3.normalize(
      vec3.create(),
      cameraSpace.fromWorld(vec3.create(), out.position, out.quaternion, target),
    );
    new CameraOffsetExtension({ offset: [3, 0, 0], preserveComposition: true }).update(out);

    const after = vec3.normalize(
      vec3.create(),
      cameraSpace.fromWorld(vec3.create(), out.position, out.quaternion, target),
    );
    expectClose(out.position, [3, 0, 0]);
    expectClose(after, before);
    expectClose(out.lookAtTarget, target);
  });

  it('with preserveComposition and an orthographic camera, keeps the look-at target at the same sideways offset on screen', () => {
    const target: Vec3 = [2, 1, -10];
    const out = lookingAt(target);
    const before = cameraSpace.fromWorld(vec3.create(), out.position, out.quaternion, target);
    new CameraOffsetExtension({ offset: [3, 0, 4], preserveComposition: true, orthographic: true }).update(out);

    const after = cameraSpace.fromWorld(vec3.create(), out.position, out.quaternion, target);
    expectClose([after[0], after[1]], [before[0], before[1]]);
  });

  it('with preserveComposition but nothing to look at, only moves the camera', () => {
    const out = cameraState.create();
    new CameraOffsetExtension({ offset: [3, 0, 0], preserveComposition: true }).update(out);

    expectClose(out.position, [3, 0, 0]);
    expectClose(out.quaternion, [0, 0, 0, 1]);
  });

  it('adds the same offset every frame on top of a damped Body, without building up', () => {
    const klipp = new Klipp();
    const camera = new VirtualCamera('a');
    camera.body = new HardLockToTargetBody(targetPose.create(), { damping: 0.5 });
    camera.addExtension(new CameraOffsetExtension({ offset: [1, 0, 0] }));
    klipp.add(camera);
    for (let i = 0; i < 300; i++) klipp.update(1 / 60);

    expect(klipp.shot.position[0]).toBeCloseTo(1, 6);
  });
});
