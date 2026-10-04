import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BasicMultiChannelPerlinNoise } from '../../../src/core/noise/BasicMultiChannelPerlinNoise';
import { BasicMultiChannelPerlinNoiseThree } from '../../../src/three/noise/BasicMultiChannelPerlinNoiseThree';
import * as cameraState from '../../../src/core/CameraState';

describe('BasicMultiChannelPerlinNoiseThree', () => {
  it('takes its vectors as a Vector3, a tuple or one number, and keeps the defaults of the rest', () => {
    const noise = new BasicMultiChannelPerlinNoiseThree({
      positionAmplitude: new Vector3(0.1, 0.2, 0),
      rotationAmplitude: [1, 2, 3],
      rotationFrequency: 2,
      frequencyGain: 3,
    });

    expect(noise.positionAmplitude).toEqual([0.1, 0.2, 0]);
    expect(noise.rotationAmplitude).toEqual([1, 2, 3]);
    expect(noise.rotationFrequency).toEqual([2, 2, 2]);
    expect(noise.positionFrequency).toEqual([1, 1, 1]);
    expect(noise.frequencyGain).toBe(3);
  });

  it('shakes exactly like the core class with the same settings', () => {
    const three = new BasicMultiChannelPerlinNoiseThree({ positionAmplitude: new Vector3(0.1, 0.1, 0), seed: 7 });
    const core = new BasicMultiChannelPerlinNoise({ positionAmplitude: [0.1, 0.1, 0], seed: 7 });
    const a = cameraState.create();
    const b = cameraState.create();

    for (let i = 0; i < 10; i++) {
      three.update(a, 0.1, i === 0);
      core.update(b, 0.1, i === 0);
    }
    expect(a).toEqual(b);
    expect(a.position).not.toEqual([0, 0, 0]);
  });
});
