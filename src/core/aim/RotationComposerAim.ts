import { vec3, type Vec3 } from 'math';

import * as targetPose from '../targetPose';
import type { CameraState } from '../cameraState';
import type { TargetPose } from '../targetPose';

import type { DampingConstant } from '../damping/damping';

import * as rotationComposer from './rotationComposer';
import type { RotationComposerParams } from './rotationComposer';

export type RotationComposerOptions = Partial<RotationComposerParams>;

/** Rotates the camera to place a target at `screenPosition`. Layers override `readTarget`. */
export class RotationComposerAim<T = TargetPose | null> implements RotationComposerParams {
  target: T;
  declare lookAt: 'target' | 'body';
  declare screenPosition: [number, number];
  declare aspect: number;
  declare orthographic: boolean;
  declare deadZone: [number, number];
  declare damping: DampingConstant;
  declare maxSpeed: number;
  declare hardLimit: [number, number];
  declare targetOffset: Vec3;
  declare lookaheadTime: number;
  declare lookaheadSmoothing: number;
  declare lookaheadIgnoreY: boolean;

  readonly state = rotationComposer.createState();
  private lastTarget: T | undefined = undefined;
  private lastLookAt: 'target' | 'body' | undefined = undefined;
  private readonly bodyPose = targetPose.create();

  constructor(target: T, options?: RotationComposerOptions) {
    this.target = target;
    Object.assign(this, rotationComposer.createParams(options));
  }

  primeFrom = (): void => rotationComposer.prime(this.state);

  update = (out: CameraState, dt: number, justActivated: boolean): void => {
    const pose = this.lookAt === 'body' ? this.readBodyTarget(out) : this.readTarget();
    if (pose) {
      if (this.target !== this.lastTarget || this.lookAt !== this.lastLookAt) rotationComposer.retarget(this.state);
      this.lastTarget = this.target;
      this.lastLookAt = this.lookAt;
    }
    rotationComposer.update(out, this.state, this, pose, dt, justActivated);
  };

  /** The Body's tracked point, with rotation and extent from `target` when it resolves. */
  private readBodyTarget(out: CameraState): TargetPose | null {
    if (!out.hasTarget) return null;
    const own = this.target == null ? null : this.readTarget();
    if (own) targetPose.copy(this.bodyPose, own);
    else {
      this.bodyPose.hasRotation = false;
      this.bodyPose.extent.radius = 0;
      this.bodyPose.extent.hasSize = false;
    }
    vec3.copy(this.bodyPose.position, out.target);
    return this.bodyPose;
  }

  /** This frame's target pose with its extent, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
