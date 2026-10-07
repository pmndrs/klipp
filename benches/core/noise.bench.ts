import { bench, group } from '@pmndrs/labs';
import { Vector3 } from 'three';

import * as cameraState from '../../src/core/CameraState';
import { BasicMultiChannelPerlinNoise } from '../../src/core/noise/BasicMultiChannelPerlinNoise';

import { GroupFramingExtensionThree } from '../../src/three/extension/GroupFramingExtensionThree';
import { TargetGroup } from '../../src/three/extension/TargetGroup';

import { warm } from '../warm';

group('Noise/Extension.update @noise', () => {
  bench('BasicMultiChannelPerlin', function* () {
    const perlin = new BasicMultiChannelPerlinNoise({
      positionAmplitude: [0.4, 0.4, 0.4],
      positionFrequency: [1, 1, 1],
      rotationAmplitude: [4, 4, 4],
      rotationFrequency: [1, 1, 1],
      amplitudeGain: 1,
      frequencyGain: 1,
      seed: 42,
      amplitudeDamping: 0.5,
    });
    const out = cameraState.create();
    yield warm(() => {
      perlin.update(out, 0.016, false);
      return out.position[0];
    });
  });

  bench('GroupFraming (single member)', function* () {
    const targetGroup = new TargetGroup([{ target: new Vector3(0, 0, 0), radius: 1 }]);
    const groupFraming = new GroupFramingExtensionThree(targetGroup, {
      padding: 40,
      viewportWidth: 1920,
      viewportHeight: 1080,
      damping: 0.5,
    });
    const out = cameraState.create();
    yield warm(() => {
      groupFraming.update(out, 0.016, false);
      return out.position[2];
    });
  });
});
