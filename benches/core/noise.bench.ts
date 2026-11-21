import { bench, group } from '@pmndrs/labs';
import { vec3 } from 'math';
import { Vector3 } from 'three';

import * as cameraState from '../../src/core/cameraState';
import { SplineRollExtension } from '../../src/core/extension/SplineRollExtension';
import { BasicMultiChannelPerlinNoise } from '../../src/core/noise/BasicMultiChannelPerlinNoise';

import { SplineDollyBodyThree } from '../../src/three/body/SplineDollyBodyThree';
import { GroupFramingExtensionThree } from '../../src/three/extension/GroupFramingExtensionThree';
import { TargetGroup } from '../../src/three/extension/TargetGroup';

import { makeTrack } from '../targets';

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
    yield () => {
      perlin.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('GroupFraming (single member)', function* () {
    const targetGroup = new TargetGroup([{ target: new Vector3(0, 0, 0), radius: 1 }]);
    const groupFraming = new GroupFramingExtensionThree(targetGroup, {
      padding: 40,
      aspect: 1920 / 1080,
      damping: 0.5,
    });
    const out = cameraState.create();
    yield () => {
      groupFraming.update(out, 0.016, false);
      return out.position[2];
    };
  });

  bench('SplineRoll (3 points)', function* () {
    const dolly = new SplineDollyBodyThree({
      spline: makeTrack(8),
      closed: true,
      automaticDolly: { method: 'fixedSpeed', speed: 0.1 },
    });
    const roll = new SplineRollExtension({
      points: [
        { position: 0.1, roll: 20 },
        { position: 0.4, roll: -30 },
        { position: 0.7, roll: 0 },
      ],
    });
    roll.cameraBody = dolly;
    const out = cameraState.create();
    yield () => {
      // A camera starts every frame from its own up, so the roll never turns it twice.
      vec3.set(out.referenceUp, 0, 1, 0);
      dolly.update(out, 0.016, false);
      roll.update(out);
      return out.referenceUp[0];
    };
  });

  bench('SplineRoll (30 points, knot units, splineOffset)', function* () {
    const dolly = new SplineDollyBodyThree({
      spline: makeTrack(32),
      closed: true,
      positionUnits: 'knot',
      splineOffset: [0, 0.8, 0],
      automaticDolly: { method: 'fixedSpeed', speed: 1 },
    });
    const roll = new SplineRollExtension({
      points: Array.from({ length: 30 }, (_, i) => ({ position: i + 0.5, roll: 30 * Math.sin(i) })),
      easing: 0.5,
    });
    roll.cameraBody = dolly;
    const out = cameraState.create();
    yield () => {
      // A camera starts every frame from its own up, so the roll never turns it twice.
      vec3.set(out.referenceUp, 0, 1, 0);
      dolly.update(out, 0.016, false);
      roll.update(out);
      return out.referenceUp[0];
    };
  });
});
