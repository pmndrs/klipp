import { vec3, type Vec3 } from 'math';
import type { CameraState } from '../CameraState.js';
import type { BasicMultiChannelPerlinNoise } from '../noise/BasicMultiChannelPerlinNoise.js';
import type { ImpulseField } from './ImpulseField.js';
import type { ImpulseListenerParams } from './impulseListener.js';
import * as impulseListener from './impulseListener.js';

const scratchOffset: Vec3 = [0, 0, 0];

export type ImpulseListenerOptions = Partial<ImpulseListenerParams> & {
  /** Perlin shake driven by the impulse strength. */
  shake?: BasicMultiChannelPerlinNoise;
};

/** Applies impulse offsets and optional strength-driven Perlin shake. */
export class ImpulseListenerNoise implements ImpulseListenerParams {
  declare field: ImpulseField;
  declare channelMask: number;
  declare gain: number;
  declare cameraSpace: boolean;
  shake?: BasicMultiChannelPerlinNoise;

  constructor(options?: ImpulseListenerOptions) {
    Object.assign(this, impulseListener.createParams(options));
    this.shake = options?.shake;
  }

  /** Apply the current impulse effect and report whether events remain active. */
  update = (out: CameraState, dt: number, justActivated: boolean, now?: number): boolean => {
    const strength = this.field.sampleAt(scratchOffset, out.position, this.channelMask, this.gain, now);
    if (this.cameraSpace) vec3.transformQuat(scratchOffset, scratchOffset, out.quaternion);
    vec3.add(out.position, out.position, scratchOffset);

    if (this.shake) {
      this.shake.amplitudeGain = strength;
      this.shake.update(out, dt, justActivated);
    }

    return this.field.hasEvents;
  };
}
