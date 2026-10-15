import type { Vec3 } from 'math';

import type { CameraState } from '../cameraState';

import type { DampingConstant } from '../damping/damping';

import * as basicMultiChannelPerlin from './basicMultiChannelPerlin';
import type { BasicMultiChannelPerlinParams, BasicMultiChannelPerlinState } from './basicMultiChannelPerlin';

export type BasicMultiChannelPerlinOptions = Partial<BasicMultiChannelPerlinParams> & {
  /** Seed for the six independent Perlin channels. Random when omitted. */
  seed?: number;
};

/** Adds Perlin position and rotation noise to a camera state. */
export class BasicMultiChannelPerlinNoise implements BasicMultiChannelPerlinParams {
  declare positionAmplitude: Vec3;
  declare positionFrequency: Vec3;
  declare rotationAmplitude: Vec3;
  declare rotationFrequency: Vec3;
  declare amplitudeGain: number;
  declare frequencyGain: number;
  declare amplitudeDamping: DampingConstant;

  readonly state: BasicMultiChannelPerlinState;

  constructor(options?: BasicMultiChannelPerlinOptions) {
    Object.assign(this, basicMultiChannelPerlin.createParams(options));
    this.state = basicMultiChannelPerlin.createState(options?.seed ?? Math.random() * 10000, this.amplitudeGain);
  }

  update = (out: CameraState, dt: number, justActivated: boolean): void =>
    basicMultiChannelPerlin.update(out, this.state, this, dt, justActivated);
}
