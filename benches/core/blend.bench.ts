import { bench, group } from '@pmndrs/labs';
import { vec3 } from 'math';
import { Matrix4, Quaternion, Vector3 } from 'three';

import * as cameraState from '../../src/core/CameraState';
import { BlendHints } from '../../src/core/blend/BlendHints';

/** Runs every frame of a blend, and never once it settles. */
group('cameraState.lerp @blend', () => {
  function makeOrbitingState(position: Vector3, lookAtTarget: Vector3) {
    const state = cameraState.create();
    position.toArray(state.position);
    new Quaternion()
      .setFromRotationMatrix(new Matrix4().lookAt(position, lookAtTarget, new Vector3(0, 1, 0)))
      .toArray(state.quaternion);
    lookAtTarget.toArray(state.target);
    state.hasTarget = true;
    lookAtTarget.toArray(state.lookAtTarget);
    state.hasLookAtTarget = true;
    return state;
  }

  bench('plain slerp (no lookAtTarget)', function* () {
    const a = cameraState.create();
    vec3.set(a.position, 5, 5, 5);
    const b = cameraState.create();
    vec3.set(b.position, 0, 0, 5);
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2).toArray(b.quaternion);
    const out = cameraState.create();
    yield () => cameraState.lerp(out, a, b, 0.5).position[0];
  });

  bench('lookAtTarget-driven rotation', function* () {
    const a = makeOrbitingState(new Vector3(5, 5, 5), new Vector3(0, 0, 0));
    const b = makeOrbitingState(new Vector3(0, 0, 5), new Vector3(0, 0, 0));
    const out = cameraState.create();
    yield () => cameraState.lerp(out, a, b, 0.5).position[0];
  });

  bench('lookAtTarget-driven rotation + sphericalPosition hint', function* () {
    const a = makeOrbitingState(new Vector3(5, 5, 5), new Vector3(0, 0, 0));
    const b = makeOrbitingState(new Vector3(0, 0, 5), new Vector3(0, 0, 0));
    const out = cameraState.create();
    yield () => cameraState.lerp(out, a, b, 0.5, BlendHints.sphericalPosition).position[0];
  });
});
