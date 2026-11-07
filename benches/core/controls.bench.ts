import { bench, group } from '@pmndrs/labs';

import { prepare, run } from '../../src/core/internal';
import { Klipp } from '../../src/core/Klipp';
import type { VirtualCamera } from '../../src/core/VirtualCamera';

import { HardLookAtAimThree } from '../../src/three/aim/HardLookAtAimThree';
import { OrbitFollowBodyThree } from '../../src/three/body/OrbitFollowBodyThree';
import { KlippControlsThree, type KlippControlsThreeOptions } from '../../src/three/controls/KlippControlsThree';
import { VirtualCameraThree } from '../../src/three/VirtualCameraThree';

import { makeMovingTarget } from '../targets';

type Input = { orbit?: boolean; zoom?: boolean; pan?: boolean };

/** One camera's frame on its own: the pieces and the state it leaves, without arbitration or the three.js write. */
function cameraFrame(camera: VirtualCamera, step: () => void, orthographic: boolean) {
  new Klipp().add(camera);
  return () => {
    step();
    camera[prepare](1920, 1080, orthographic);
    camera[run](0.016);
    return camera.state.position[0];
  };
}

/** A KlippControls on a moving target, with input on the chosen axes every frame. */
function controls(input: Input, options: KlippControlsThreeOptions = {}, orthographic = false) {
  const { object, step } = makeMovingTarget();
  const camera = new KlippControlsThree('controls', {
    target: object,
    minDistance: 2,
    maxDistance: 40,
    initialState: { orthographicSize: 5 },
    ...options,
  });
  let t = 0;
  return cameraFrame(
    camera,
    () => {
      t += 0.016;
      step();
      if (input.orbit) {
        camera.horizontal.applyDelta(0.5);
        camera.vertical.applyDelta(Math.sin(t) * 0.5);
      }
      if (input.zoom) camera.zoom.applyDelta(Math.sin(t * 0.7) * 0.01);
      if (input.pan) {
        camera.panX.applyDelta(Math.cos(t) * 3);
        camera.panY.applyDelta(Math.sin(t) * 3);
      }
    },
    orthographic,
  );
}

const damped = { damping: 0.2 };

group('KlippControls, one camera frame @controls', () => {
  bench('OrbitFollow + HardLookAt by hand, orbit and zoom input', function* () {
    const { object, step } = makeMovingTarget();
    const camera = new VirtualCameraThree('orbit');
    const body = new OrbitFollowBodyThree(object);
    camera.body = body;
    camera.aim = new HardLookAtAimThree(object);
    let t = 0;
    yield cameraFrame(
      camera,
      () => {
        t += 0.016;
        step();
        body.horizontal.applyDelta(0.5);
        body.vertical.applyDelta(Math.sin(t) * 0.5);
        body.radial.applyDelta(Math.sin(t * 0.7) * 0.01);
      },
      false,
    );
  });

  bench('idle, moving target', function* () {
    yield controls({});
  });

  bench('orbit input', function* () {
    yield controls({ orbit: true });
  });

  bench('orbit and zoom input', function* () {
    yield controls({ orbit: true, zoom: true });
  });

  bench('orbit, zoom and pan input', function* () {
    yield controls({ orbit: true, zoom: true, pan: true });
  });

  bench('orbit, zoom and pan input, every axis damped, lockToTarget', function* () {
    yield controls(
      { orbit: true, zoom: true, pan: true },
      {
        horizontal: damped,
        vertical: damped,
        zoom: damped,
        pan: damped,
        orbit: { damping: 0.3, rotationDamping: 0.3, bindingMode: 'lockToTarget' },
      },
    );
  });

  bench('orbit, zoom and pan input, orthographic', function* () {
    yield controls({ orbit: true, zoom: true, pan: true }, {}, true);
  });

  bench('orbit, zoom and pan input, threeRing', function* () {
    yield controls({ orbit: true, zoom: true, pan: true }, { orbit: { orbitStyle: 'threeRing' } });
  });
});
