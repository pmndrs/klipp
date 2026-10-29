import { bench, group } from '@pmndrs/labs';
import { vec3 } from 'math';
import { Vector3 } from 'three';

import * as cameraState from '../../src/core/cameraState';

import { HardLookAtAimThree } from '../../src/three/aim/HardLookAtAimThree';
import { RotationComposerAimThree } from '../../src/three/aim/RotationComposerAimThree';
import { SplineDollyLookAtTargetsAimThree } from '../../src/three/aim/SplineDollyLookAtTargetsAimThree';
import { SplineDollyBodyThree } from '../../src/three/body/SplineDollyBodyThree';

import { makeMovingTarget, makeTrack } from '../targets';

group('Aim.update @aim', () => {
  bench('HardLookAt', function* () {
    const { object, step } = makeMovingTarget();
    const aim = new HardLookAtAimThree(object);
    const out = cameraState.create();
    vec3.set(out.position, 0, 2, 15);
    yield () => {
      step();
      aim.update(out);
      return out.quaternion[0];
    };
  });

  bench('RotationComposer (deadZone + hardLimit)', function* () {
    const { object, step } = makeMovingTarget();
    const aim = new RotationComposerAimThree(object, {
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
    });
    const out = cameraState.create();
    vec3.set(out.position, 0, 2, 15);
    yield () => {
      step();
      aim.update(out, 0.016, false);
      return out.quaternion[0];
    };
  });

  bench('RotationComposer (deadZone + hardLimit, orthographic)', function* () {
    const { object, step } = makeMovingTarget();
    const aim = new RotationComposerAimThree(object, {
      screenPosition: [0, 0],
      aspect: 16 / 9,
      orthographic: true,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
    });
    const out = cameraState.create();
    out.orthographicSize = 5;
    vec3.set(out.position, 0, 2, 15);
    yield () => {
      step();
      aim.update(out, 0.016, false);
      return out.quaternion[0];
    };
  });

  bench('RotationComposer (deadZone + hardLimit + lookahead)', function* () {
    const { object, step } = makeMovingTarget();
    const aim = new RotationComposerAimThree(object, {
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
      targetOffset: [0, 0, 0],
      lookaheadTime: 0.3,
      lookaheadSmoothing: 1,
    });
    const out = cameraState.create();
    vec3.set(out.position, 0, 2, 15);
    yield () => {
      step();
      aim.update(out, 0.016, false);
      return out.quaternion[0];
    };
  });

  // Where a live camera spends most frames: both dampers return early.
  bench('RotationComposer (damped, converged on a still target)', function* () {
    const aim = new RotationComposerAimThree(new Vector3(0, 2, -20), {
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0, 0],
      damping: 0.5,
    });
    const out = cameraState.create();
    vec3.set(out.position, 0, 2, 15);
    aim.update(out, 0.016, true);
    yield () => {
      aim.update(out, 0.016, false);
      return out.quaternion[0];
    };
  });

  for (const withTargets of [false, true]) {
    bench(`SplineDollyLookAtTargets (${withTargets ? '3 targets' : 'along the path'})`, function* () {
      const { object, step } = makeMovingTarget();
      const dolly = new SplineDollyBodyThree({
        spline: makeTrack(8),
        closed: true,
        positionUnits: 'knot',
        automaticDolly: { method: 'fixedSpeed', speed: 1 },
      });
      const aim = new SplineDollyLookAtTargetsAimThree({
        targets: withTargets
          ? [
              { position: 0, lookAt: object },
              { position: 3, lookAt: [0, 1, 0] },
              { position: 6, lookAt: [20, 2, 5] },
            ]
          : [],
        easing: 0.6,
      });
      aim.cameraBody = dolly;
      const out = cameraState.create();
      yield () => {
        step();
        dolly.update(out, 0.016, false);
        aim.update(out);
        return out.quaternion[0];
      };
    });
  }
});
