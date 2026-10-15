import type { Quat, Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import type { TargetPose } from '../targetPose';

import { applyAxisSettings } from '../input/applyAxisSettings';
import type { InputAxisSettings } from '../input/axis';
import type { InputAxisOwner } from '../input/InputAxisOwner';

import * as panTilt from './panTilt';

export type PanTiltOptions = { pan?: InputAxisSettings; tilt?: InputAxisSettings };

/** Rotation from two `InputAxis`: `pan` (yaw) and `tilt` (pitch), relative to an optional target's rotation. */
export class PanTiltAim<T = TargetPose | null> implements InputAxisOwner {
  readonly state = panTilt.createState();
  readonly pan = this.state.pan;
  readonly tilt = this.state.tilt;
  readonly inputAxes = { pan: this.pan, tilt: this.tilt };

  /** Makes `pan` and `tilt` relative to this target's rotation. */
  target: T;

  constructor(target: T = null as T, options?: PanTiltOptions) {
    this.target = target;
    const defaults = panTilt.createAxisSettings();
    for (const name of ['pan', 'tilt'] as const) {
      applyAxisSettings(this[name], defaults[name], options?.[name]);
      this[name].setValue(this[name].center);
    }
  }

  update = (out: CameraState, dt: number): boolean => panTilt.update(out, this.state, this.targetRotation(), dt);

  /** Eases `pan` and `tilt` toward `rotation`, around the last frame's `referenceUp` by default. */
  setFromRotation = (rotation: Quat, referenceUp: Vec3 = this.state.referenceUp): void => {
    panTilt.setFromRotation(this.state, this.targetRotation(), rotation, referenceUp);
  };

  /** Start facing `rotation`, with both axes settled there instead of easing in. */
  primeFrom = (rotation: Quat, referenceUp: Vec3): void => {
    this.setFromRotation(rotation, referenceUp);
    this.pan.reset();
    this.tilt.reset();
  };

  /** This frame's target pose, or `null` when there is none. Only its rotation is read. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }

  private targetRotation(): Quat | null {
    const pose = this.readTarget();
    return pose?.hasRotation ? pose.rotation : null;
  }
}
