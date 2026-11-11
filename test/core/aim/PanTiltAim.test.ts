import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it, vi } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { PanTiltAim } from '../../../src/core/aim/PanTiltAim';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

describe('PanTiltAim', () => {
  it('asks for a frame from setFromRotation', () => {
    const aim = new PanTiltAim();
    const camera = new VirtualCamera('look');
    camera.setAim(aim);
    const klipp = new Klipp();
    klipp.add(camera);
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);

    aim.setFromRotation(quat.setAxisAngle(quat.create(), [0, 1, 0], 1));
    expect(requested).toHaveBeenCalledTimes(1);
  });

  const forward = (out: { quaternion: [number, number, number, number] }): Vec3 =>
    vec3.transformQuat(vec3.create(), [0, 0, -1], out.quaternion);

  it('looks at a point from where the camera is on the next frame, right away or eased', () => {
    const aim = new PanTiltAim();
    const out = cameraState.create();
    vec3.set(out.position, 0, 0, 0);
    aim.lookAt([10, 0, 0]);
    aim.update(out, 0.016);
    expect(forward(out)[0]).toBeCloseTo(1, 6);

    aim.lookAt([0, 10, -10], { damping: 0.3 });
    aim.update(out, 0.016);
    expect(forward(out)[1]).toBeLessThan(Math.SQRT1_2 - 0.01);
    for (let i = 0; i < 300; i++) aim.update(out, 0.016);
    expect(forward(out)[1]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(forward(out)[2]).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it('stops a move of both axes on input on either', () => {
    const aim = new PanTiltAim();
    const out = cameraState.create();
    aim.setFromRotation(quat.setAxisAngle(quat.create(), [1, 0, 0], 0.5), { damping: 0.3 });
    aim.update(out, 0.016);
    aim.pan.applyDelta(1);
    aim.update(out, 0.016);
    const { value } = aim.tilt;
    for (let i = 0; i < 10; i++) aim.update(out, 0.016);
    expect(aim.tilt.value).toBe(value);
  });

  it('looks at a point straight above the camera', () => {
    const aim = new PanTiltAim();
    const out = cameraState.create();
    aim.lookAt([0, 10, 0]);
    aim.update(out, 0.016);
    expect(aim.tilt.value).toBeCloseTo(-90, 6);
    expect(Number.isFinite(aim.pan.value)).toBe(true);
    expect(forward(out)[1]).toBeCloseTo(1, 6);
  });

  it('gives the camera forward from its axes, in the frame of a turned target, and level with flatten', () => {
    const pose = targetPose.create();
    pose.hasRotation = true;
    quat.setAxisAngle(pose.rotation, vec3.normalize(vec3.create(), [1, 0, 1]), 0.6);
    const aim = new PanTiltAim(pose, { pan: { center: 30 }, tilt: { center: -20 } });
    const out = cameraState.create();
    aim.update(out, 0.016);
    const camera = forward(out);
    const along = aim.forward(vec3.create());
    for (let i = 0; i < 3; i++) expect(along[i]).toBeCloseTo(camera[i], 9);

    const up = vec3.transformQuat(vec3.create(), [0, 1, 0], pose.rotation);
    aim.tilt.setValue(-90);
    const level = aim.forward(vec3.create(), true);
    expect(vec3.dot(level, up)).toBeCloseTo(0, 9);
    expect(vec3.length(level)).toBeCloseTo(1, 9);
  });
});
