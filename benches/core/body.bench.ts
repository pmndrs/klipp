import { bench, group } from '@pmndrs/labs';

import * as cameraState from '../../src/core/cameraState';

import { FollowBodyThree } from '../../src/three/body/FollowBodyThree';
import { HardLockToTargetBodyThree } from '../../src/three/body/HardLockToTargetBodyThree';
import { OrbitFollowBodyThree } from '../../src/three/body/OrbitFollowBodyThree';
import { PositionComposerBodyThree } from '../../src/three/body/PositionComposerBodyThree';
import { SplineDollyBodyThree } from '../../src/three/body/SplineDollyBodyThree';

import { makeMovingMeshTarget, makeMovingTarget, makeTrack } from '../targets';

group('Body.update @body', () => {
  bench('HardLockToTarget', function* () {
    const { object, step } = makeMovingTarget();
    const body = new HardLockToTargetBodyThree(object, { damping: 0.5 });
    const out = cameraState.create();
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('Follow (lockToTarget binding)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new FollowBodyThree(object, { offset: [0, 3, 8], damping: 0.5 });
    const out = cameraState.create();
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('OrbitFollow (damping, axis moving)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new OrbitFollowBodyThree(object, { damping: 0.5 });
    const out = cameraState.create();
    yield () => {
      step();
      body.horizontal.applyDelta(0.5);
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('OrbitFollow (threeRing, damping, axis moving)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new OrbitFollowBodyThree(object, { orbitStyle: 'threeRing', damping: 0.5 });
    const out = cameraState.create();
    yield () => {
      step();
      body.horizontal.applyDelta(0.5);
      body.vertical.applyDelta(Math.sin(body.horizontal.value) * 0.5);
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('PositionComposer (deadZone + hardLimit)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new PositionComposerBodyThree(object, {
      cameraDistance: 10,
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
    });
    const out = cameraState.create();
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('PositionComposer (deadZone + hardLimit, orthographic)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new PositionComposerBodyThree(object, {
      cameraDistance: 10,
      screenPosition: [0, 0],
      aspect: 16 / 9,
      orthographic: true,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
    });
    const out = cameraState.create();
    out.orthographicSize = 5;
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('PositionComposer (deadZone + hardLimit + lookahead)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new PositionComposerBodyThree(object, {
      cameraDistance: 10,
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
      depthDeadZone: 0,
      lookaheadTime: 0.3,
      lookaheadSmoothing: 1,
    });
    const out = cameraState.create();
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('PositionComposer (radius extent)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new PositionComposerBodyThree(object, {
      cameraDistance: 10,
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
      radius: 1.5,
    });
    const out = cameraState.create();
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('PositionComposer (explicit size extent, rotating box)', function* () {
    const { object, step } = makeMovingTarget();
    const body = new PositionComposerBodyThree(object, {
      cameraDistance: 10,
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
      size: [2, 2, 2],
    });
    const out = cameraState.create();
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('PositionComposer (auto-detected Mesh size extent, rotating box)', function* () {
    const { object, step } = makeMovingMeshTarget();
    const body = new PositionComposerBodyThree(object, {
      cameraDistance: 10,
      screenPosition: [0, 0],
      aspect: 16 / 9,
      deadZone: [0.2, 0.2],
      damping: 0.5,
      hardLimit: [0.4, 0.4],
    });
    const out = cameraState.create();
    yield () => {
      step();
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('SplineDolly (position, damping)', function* () {
    const body = new SplineDollyBodyThree({ spline: makeTrack(8), closed: true, damping: 0.5 });
    const out = cameraState.create();
    let t = 0;
    yield () => {
      t += 0.016;
      body.position = t * 0.1;
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  bench('SplineDolly (duration, loop, splineOffset)', function* () {
    const body = new SplineDollyBodyThree({
      spline: makeTrack(8),
      closed: true,
      damping: 0.5,
      splineOffset: [1, 0.5, 0],
      automaticDolly: { method: 'duration', from: 0, to: 1, duration: 5, loop: 'loop' },
    });
    const out = cameraState.create();
    yield () => {
      body.update(out, 0.016, false);
      return out.position[0];
    };
  });

  for (const knots of [8, 50]) {
    bench(`SplineDolly (nearestPointToTarget, ${knots} knots)`, function* () {
      const { object, step } = makeMovingTarget();
      const body = new SplineDollyBodyThree({
        target: object,
        spline: makeTrack(knots),
        closed: true,
        damping: 0.5,
        automaticDolly: { method: 'nearestPointToTarget' },
      });
      const out = cameraState.create();
      yield () => {
        step();
        body.update(out, 0.016, false);
        return out.position[0];
      };
    });
  }
});
