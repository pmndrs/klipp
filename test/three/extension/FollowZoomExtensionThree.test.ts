import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';

import { FollowZoomExtensionThree } from '../../../src/three/extension/FollowZoomExtensionThree';

describe('FollowZoomExtensionThree', () => {
  it("keeps the shot width at an Object3D's world position", () => {
    const parent = new Object3D();
    parent.position.set(0, 0, -6);
    const target = new Object3D();
    target.position.set(0, 0, -4);
    parent.add(target);
    parent.updateMatrixWorld();
    const out = cameraState.create();

    new FollowZoomExtensionThree(target, { width: 4, damping: 0 }).update(out, 0.1, true);

    expect(out.fov).toBeCloseTo((2 * Math.atan(0.2) * 180) / Math.PI, 10);
  });
});
