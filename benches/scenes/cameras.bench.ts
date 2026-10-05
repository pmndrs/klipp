import { bench, group } from '@pmndrs/labs';
import { Object3D, PerspectiveCamera } from 'three';

import { BlendCurves } from '../../src/core/blend/BlendCurves';
import type { StandbyUpdate } from '../../src/core/VirtualCamera';

import { RotationComposerAimThree } from '../../src/three/aim/RotationComposerAimThree';
import { FollowBodyThree } from '../../src/three/body/FollowBodyThree';
import { KlippThree } from '../../src/three/KlippThree';
import { BasicMultiChannelPerlinNoiseThree } from '../../src/three/noise/BasicMultiChannelPerlinNoiseThree';

type SceneOptions = { cameras: number; standbyUpdate?: StandbyUpdate; sharedTarget?: boolean };

/** A whole frame of cameras, each Follow + RotationComposer + Perlin on its own moving target. */
function scene({ cameras, standbyUpdate = 'roundRobin', sharedTarget = false }: SceneOptions) {
  const klipp = new KlippThree(new PerspectiveCamera());
  klipp.setSize(1920, 1080);
  const targets: Object3D[] = [];
  for (let i = 0; i < cameras; i++) {
    if (i === 0 || !sharedTarget) targets.push(new Object3D());
    const target = targets[targets.length - 1];
    const camera = klipp.addCamera(`camera-${i}`, { priority: i === 0 ? 10 : 0, standbyUpdate });
    camera.body = new FollowBodyThree(target, { offset: [0, 3, 8], damping: 0.3 });
    camera.aim = new RotationComposerAimThree(target, { deadZone: [0.1, 0.1], damping: 0.4 });
    camera.addNoise(new BasicMultiChannelPerlinNoiseThree({ positionAmplitude: [0.1, 0.1, 0.1], seed: i }));
  }

  let time = 0;
  return () => {
    time += 0.016;
    for (let i = 0; i < targets.length; i++) {
      targets[i].position.set(Math.sin(time + i) * 10, 2, Math.cos(time + i) * 10);
      targets[i].updateMatrixWorld();
    }
    klipp.update(0.016);
    return klipp.shot.position[0];
  };
}

group('KlippThree.update, whole frames @scene', () => {
  bench('1 camera', function* () {
    yield scene({ cameras: 1 });
  });

  bench('10 cameras, roundRobin', function* () {
    yield scene({ cameras: 10 });
  });

  bench('50 cameras, roundRobin', function* () {
    yield scene({ cameras: 50 });
  });

  bench('50 cameras, one shared target, roundRobin', function* () {
    yield scene({ cameras: 50, sharedTarget: true });
  });

  bench('50 cameras, always', function* () {
    yield scene({ cameras: 50, standbyUpdate: 'always' });
  });

  bench('50 cameras, never', function* () {
    yield scene({ cameras: 50, standbyUpdate: 'never' });
  });

  // A blend that never ends, so every frame interpolates between two moving cameras.
  bench('2 cameras, blending', function* () {
    const klipp = new KlippThree(new PerspectiveCamera(), {
      defaultBlend: { curve: BlendCurves.easeInOut, time: Number.MAX_VALUE },
    });
    klipp.setSize(1920, 1080);
    const target = new Object3D();
    const from = klipp.addCamera('from', { priority: 1 });
    from.body = new FollowBodyThree(target, { offset: [0, 3, 8], damping: 0.3 });
    from.aim = new RotationComposerAimThree(target, { damping: 0.4 });
    klipp.update(0.016);
    const to = klipp.addCamera('to', { priority: 2 });
    to.body = new FollowBodyThree(target, { offset: [6, 2, 0], damping: 0.3 });
    to.aim = new RotationComposerAimThree(target, { damping: 0.4 });

    let time = 0;
    yield () => {
      time += 0.016;
      target.position.set(Math.sin(time) * 10, 2, Math.cos(time) * 10);
      target.updateMatrixWorld();
      klipp.update(0.016);
      return klipp.shot.position[0];
    };
  });
});
