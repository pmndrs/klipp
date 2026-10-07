import { bench, group } from '@pmndrs/labs';
import { vec3 } from 'math';

import * as cameraState from '../../src/core/CameraState';
import { advance, register } from '../../src/core/internal';
import { Klipp } from '../../src/core/Klipp';
import { BasicMultiChannelPerlinNoise } from '../../src/core/noise/BasicMultiChannelPerlinNoise';
import { VirtualCamera } from '../../src/core/VirtualCamera';

import { HardLookAtAimThree } from '../../src/three/aim/HardLookAtAimThree';
import { RotationComposerAimThree } from '../../src/three/aim/RotationComposerAimThree';
import { FollowBodyThree } from '../../src/three/body/FollowBodyThree';
import { HardLockToTargetBodyThree } from '../../src/three/body/HardLockToTargetBodyThree';
import { GroupFramingExtensionThree } from '../../src/three/extension/GroupFramingExtensionThree';
import { TargetGroup } from '../../src/three/extension/TargetGroup';

import { makeMovingTarget } from '../targets';
import { warm } from '../warm';

group('VirtualCamera.update @controller', () => {
  bench('minimal: HardLockToTarget + HardLookAt', function* () {
    const { object, step } = makeMovingTarget();
    const controller = new VirtualCamera('minimal');
    controller.setBody(new HardLockToTargetBodyThree(object, { damping: 0.5 }));
    controller.setAim(new HardLookAtAimThree(object));
    const out = cameraState.create();
    yield warm(() => {
      step();
      controller.update(out, 0.016, false);
      return out.position[0];
    });
  });

  bench('full: Follow + RotationComposer + GroupFraming + Perlin (like FocusReproScene)', function* () {
    const { object, step } = makeMovingTarget();
    const controller = new VirtualCamera('full');
    const targetGroup = new TargetGroup([{ target: object, radius: 1.5 }]);
    controller.setBody(new FollowBodyThree(object, { offset: [0, 3, 12], damping: 0.5 }));
    controller.setAim({
      update: new RotationComposerAimThree(object, {
        screenPosition: [0, 0],
        aspect: 16 / 9,
        deadZone: [0.15, 0.15],
        damping: 0.5,
      }).update,
    });
    controller.addExtension({
      update: new GroupFramingExtensionThree(targetGroup, {
        padding: 40,
        viewportWidth: 1920,
        viewportHeight: 1080,
        damping: 0.5,
      }).update,
    });
    controller.addNoise({
      update: new BasicMultiChannelPerlinNoise({
        positionAmplitude: [0.1, 0.1, 0.1],
        positionFrequency: [1, 1, 1],
        rotationAmplitude: [2, 2, 2],
        rotationFrequency: [1, 1, 1],
        amplitudeGain: 1,
        frequencyGain: 1,
        seed: 7,
        amplitudeDamping: 0.5,
      }).update,
    });
    const out = cameraState.create();
    yield warm(() => {
      step();
      controller.update(out, 0.016, false);
      return out.position[0];
    });
  });
});

/** Picking the camera and blending only: the cameras' states are fixed and no pieces run. */
group('Klipp.tick @core', () => {
  function makeCoreWithCameras(count: number): Klipp {
    const core = new Klipp();
    for (let i = 0; i < count; i++) {
      const state = cameraState.create();
      vec3.set(state.position, i, 0, 0);
      core[register]({ id: `cam-${i}`, priority: i, state });
    }
    return core;
  }

  bench('1 registered camera', function* () {
    const core = makeCoreWithCameras(1);
    yield warm(() => core[advance](0.016).position[0]);
  });

  bench('10 registered cameras', function* () {
    const core = makeCoreWithCameras(10);
    yield warm(() => core[advance](0.016).position[0]);
  });

  bench('50 registered cameras', function* () {
    const core = makeCoreWithCameras(50);
    yield warm(() => core[advance](0.016).position[0]);
  });
});
