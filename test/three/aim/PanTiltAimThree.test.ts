import { vec3 } from 'math';
import { Euler, Object3D, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import type { CameraState } from '../../../src/core/cameraState';

import { PanTiltAimThree } from '../../../src/three/aim/PanTiltAimThree';

/** Yaw and pitch of `out` in degrees. */
function yawPitch(out: CameraState) {
  const euler = new Euler().setFromQuaternion(new Quaternion().fromArray(out.quaternion), 'YXZ');
  return { yaw: (euler.y * 180) / Math.PI, pitch: (euler.x * 180) / Math.PI };
}

const forwardOf = (out: CameraState) =>
  new Vector3(0, 0, -1).applyQuaternion(new Quaternion().fromArray(out.quaternion));

describe('PanTiltAimThree', () => {
  it('takes axis settings in its options, keeping the defaults it is not given, and starts each axis at its center', () => {
    const aim = new PanTiltAimThree(null, { pan: { center: 45, wrap: false }, tilt: { damping: 0.3 } });
    expect(aim.pan).toMatchObject({ center: 45, value: 45, wrap: false, range: [-180, 180] });
    expect(aim.tilt).toMatchObject({ value: 0, damping: 0.3, range: [-90, 90] });
    expect(aim.pan.recentering).not.toBe(aim.tilt.recentering);
  });

  it('turns right with positive pan and looks up with positive tilt, in degrees', () => {
    const aim = new PanTiltAimThree();
    const out = cameraState.create();
    aim.update(out, 0.016);
    expect(yawPitch(out).yaw).toBeCloseTo(0, 5);

    aim.pan.applyDelta(45);
    aim.tilt.applyDelta(-15);
    aim.update(out, 0.016);

    expect(yawPitch(out).yaw).toBeCloseTo(-45, 4);
    expect(yawPitch(out).pitch).toBeCloseTo(15, 4);
  });

  it('limits tilt to straight up and down', () => {
    const aim = new PanTiltAimThree();
    aim.tilt.applyDelta(500);
    aim.update(cameraState.create(), 0.016);
    expect(aim.tilt.value).toBe(90);
  });

  it('recenters both axes when enabled', () => {
    const aim = new PanTiltAimThree();
    aim.pan.applyDelta(90);
    aim.pan.recentering = { enabled: true, wait: 0, time: 0.5 };
    const out = cameraState.create();

    for (let i = 0; i < 100; i++) aim.update(out, 0.05);

    expect(aim.pan.value).toBeCloseTo(0, 1);
  });

  describe('reference frame', () => {
    it('turns relative to the target', () => {
      const target = new Object3D();
      target.rotation.set(0, Math.PI / 2, 0);
      target.updateMatrixWorld();
      const aim = new PanTiltAimThree();
      aim.target = target;
      const out = cameraState.create();

      aim.update(out, 0.016);

      expect(forwardOf(out).dot(new Vector3(0, 0, -1).applyQuaternion(target.quaternion))).toBeCloseTo(1, 4);
    });

    it('without a target (or before it resolves), turns around referenceUp', () => {
      const aim = new PanTiltAimThree();
      aim.target = { current: null };
      aim.pan.applyDelta(90);
      const out = cameraState.create();
      vec3.set(out.referenceUp, 0, 0, 1);

      aim.update(out, 0.016);

      expect(forwardOf(out).dot(new Vector3(0, 0, -1))).toBeCloseTo(0, 4);
      expect(Math.abs(forwardOf(out).y)).toBeLessThan(1e-4);
    });
  });

  it("setFromRotation measures around the last frame's referenceUp when none is given", () => {
    const up = new Vector3(1, 1, 0).normalize();
    const source = new PanTiltAimThree();
    source.pan.applyDelta(20);
    source.tilt.applyDelta(-10);
    const shot = cameraState.create();
    up.toArray(shot.referenceUp);
    source.update(shot, 0.016);

    const recovered = new PanTiltAimThree();
    const out = cameraState.create();
    up.toArray(out.referenceUp);
    recovered.update(out, 0.016);
    recovered.setFromRotation(shot.quaternion);
    recovered.update(out, 0.016);

    expect(recovered.pan.value).toBeCloseTo(20, 4);
    expect(recovered.tilt.value).toBeCloseTo(-10, 4);
  });

  it('setFromRotation finds the pan and tilt that reproduce a rotation, relative to the target', () => {
    const target = new Object3D();
    target.rotation.set(0.3, Math.PI / 2, 0);
    target.updateMatrixWorld();
    const up = new Vector3(0, 1, 0).applyQuaternion(target.quaternion);

    const source = new PanTiltAimThree();
    source.target = target;
    source.pan.applyDelta(20);
    source.tilt.applyDelta(-10);
    const shot = cameraState.create();
    up.toArray(shot.referenceUp);
    source.update(shot, 0.016);

    const recovered = new PanTiltAimThree();
    recovered.target = target;
    recovered.setFromRotation(shot.quaternion, shot.referenceUp);
    const out = cameraState.create();
    up.toArray(out.referenceUp);
    recovered.update(out, 0.016);

    expect(recovered.pan.value).toBeCloseTo(20, 4);
    expect(recovered.tilt.value).toBeCloseTo(-10, 4);
    expect(
      new Quaternion().fromArray(out.quaternion).angleTo(new Quaternion().fromArray(shot.quaternion)),
    ).toBeLessThan(1e-3);
  });
});
