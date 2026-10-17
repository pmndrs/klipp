import type { CameraState } from '../cameraState';

import type { BasicMultiChannelPerlinNoise } from '../noise/BasicMultiChannelPerlinNoise';

import * as impulseListener from './impulseListener';
import type { ImpulseField } from './ImpulseField';
import type { ImpulseListenerParams } from './impulseListener';

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
    const strength = impulseListener.update(out, this, now);
    if (this.shake) {
      this.shake.amplitudeGain = strength;
      this.shake.update(out, dt, justActivated);
    }

    return this.field.hasEvents;
  };
}
