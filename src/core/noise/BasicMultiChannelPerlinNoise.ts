import type { Vec3 } from 'math';
import type { CameraState } from '../CameraState.js';
import type { DampingConstant } from '../damping/damping.js';
import type { PerlinNoiseParams, PerlinNoiseState } from './perlinNoise.js';
import * as perlinNoise from './perlinNoise.js';

export type PerlinNoiseOptions = Partial<PerlinNoiseParams> & {
  /** Seed for the six independent Perlin channels. Random when omitted. */
  seed?: number;
};

/** Adds Perlin position and rotation noise to a camera state. */
export class BasicMultiChannelPerlinNoise implements PerlinNoiseParams {
  declare positionAmplitude: Vec3;
  declare positionFrequency: Vec3;
  declare rotationAmplitude: Vec3;
  declare rotationFrequency: Vec3;
  declare amplitudeGain: number;
  declare frequencyGain: number;
  declare amplitudeDamping: DampingConstant;

  readonly state: PerlinNoiseState;

  constructor(options?: PerlinNoiseOptions) {
    Object.assign(this, perlinNoise.createParams(options));
    this.state = perlinNoise.createState(options?.seed ?? Math.random() * 10000, this.amplitudeGain);
  }

  update = (out: CameraState, dt: number, justActivated: boolean): void =>
    perlinNoise.update(out, this.state, this, dt, justActivated);
}
