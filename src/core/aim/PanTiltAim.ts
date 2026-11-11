import { vec3, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import type { TargetPose } from '../targetPose';
import type { VirtualCamera } from '../VirtualCamera';

import type { DampingConstant } from '../damping/damping';
import { applyAxisSettings } from '../input/applyAxisSettings';
import type { EaseOptions, InputAxisSettings } from '../input/axis';
import type { InputAxisOwner } from '../input/InputAxisOwner';

import * as panTilt from './panTilt';

export type PanTiltOptions = { pan?: InputAxisSettings; tilt?: InputAxisSettings };

const noOptions: EaseOptions = {};

/** Rotation from two `InputAxis`: `pan` (yaw) and `tilt` (pitch), relative to an optional target's rotation. */
export class PanTiltAim<T = TargetPose | null> implements InputAxisOwner {
  readonly state = panTilt.createState();
  readonly pan = this.state.pan;
  readonly tilt = this.state.tilt;
  readonly inputAxes = { pan: this.pan, tilt: this.tilt };
  /** The camera this Aim is on, set by the camera. */
  camera: VirtualCamera | null = null;

  /** Makes `pan` and `tilt` relative to this target's rotation. */
  target: T;

  private readonly lookRequest = { pending: false, point: [0, 0, 0] as Vec3, damping: 0 as DampingConstant };

  constructor(target: T = null as T, options?: PanTiltOptions) {
    this.target = target;
    const defaults = panTilt.createAxisSettings();
    for (const name of ['pan', 'tilt'] as const) {
      applyAxisSettings(this[name], defaults[name], options?.[name]);
      this[name].setValue(this[name].center);
    }
  }

  update = (out: CameraState, dt: number): boolean => {
    const request = this.lookRequest;
    if (request.pending) {
      request.pending = false;
      panTilt.lookAt(this.state, this.targetRotation(), out.position, request.point, out.referenceUp, request.damping);
    }
    return panTilt.update(out, this.state, this.targetRotation(), dt);
  };

  /** Moves `pan` and `tilt` toward `rotation`, around the last frame's `referenceUp`. */
  setFromRotation(rotation: Quat, { damping = 0 }: EaseOptions = noOptions): void {
    panTilt.setFromRotation(this.state, this.targetRotation(), rotation, this.state.referenceUp, damping);
    this.camera?.klipp?.requestFrame();
  }

  /** Turns the camera to look at `point`, from where the camera is on the next frame. */
  lookAt(point: Vec3, { damping = 0 }: EaseOptions = noOptions): void {
    const request = this.lookRequest;
    vec3.copy(request.point, point);
    request.damping = damping;
    request.pending = true;
    this.camera?.klipp?.requestFrame();
  }

  /** Camera forward from the axes alone, unaffected by Noise and impulses. `flatten` keeps it level. */
  forward(out: Vec3, flatten = false): Vec3 {
    return panTilt.forward(out, this.state, flatten);
  }

  /** Start facing `rotation`, with both axes settled there. */
  primeFrom = (rotation: Quat, referenceUp: Vec3): void => {
    panTilt.setFromRotation(this.state, this.targetRotation(), rotation, referenceUp);
  };

  /** This frame's target pose, or `null` when there is none. Only its rotation is read. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }

  protected targetRotation(): Quat | null {
    const pose = this.readTarget();
    return pose?.hasRotation ? pose.rotation : null;
  }
}
