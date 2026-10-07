import { bench, group } from '@pmndrs/labs';
import { Vector3 } from 'three';

import * as cameraState from '../../src/core/CameraState';

import { HardLookAtAimThree } from '../../src/three/aim/HardLookAtAimThree';
import { FollowBodyThree } from '../../src/three/body/FollowBodyThree';
import { TargetRegistry } from '../../src/three/resolve/TargetRegistry';

import { makeNestedTarget } from '../targets';
import { warm } from '../warm';

/** Two cameras, each Follow + HardLookAt on the same target, with or without registry slots. */
function* twoCamerasOnSharedTarget(depth: number, withRegistry: boolean) {
  const { object, step } = makeNestedTarget(depth);
  const registry = new TargetRegistry();
  const cameras = [new Vector3(0, 3, 8), new Vector3(5, 2, 0)].map((offset) => {
    const follow = new FollowBodyThree(object, { offset, damping: 0.5 });
    const look = new HardLookAtAimThree(object);
    if (withRegistry) follow.targetSlot = look.targetSlot = registry.acquire(object);
    return { follow, look, out: cameraState.create() };
  });
  yield warm(() => {
    step();
    if (withRegistry) registry.refresh();
    for (const { follow, look, out } of cameras) {
      follow.update(out, 0.016, false);
      look.update(out);
    }
    return cameras[0].out.position[0];
  });
}

group('Target reads, two cameras on one target @targets', () => {
  bench('depth 2, each stage resolves', () => twoCamerasOnSharedTarget(2, false));
  bench('depth 2, registry slots', () => twoCamerasOnSharedTarget(2, true));
  bench('depth 10, each stage resolves', () => twoCamerasOnSharedTarget(10, false));
  bench('depth 10, registry slots', () => twoCamerasOnSharedTarget(10, true));
});
