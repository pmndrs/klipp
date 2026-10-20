import { Box3, Sphere, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';

import { ConfinerExtensionThree } from '../../../src/three/extension/ConfinerExtensionThree';

describe('ConfinerExtensionThree', () => {
  it('confines to a three.js Box3 or Sphere, following later changes to it', () => {
    const box = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const extension = new ConfinerExtensionThree(box);
    const out = cameraState.create();
    out.position = [5, 0, 0];
    extension.update(out);
    expect(out.position).toEqual([1, 0, 0]);

    box.max.x = 3;
    out.position = [5, 0, 0];
    extension.update(out);
    expect(out.position).toEqual([3, 0, 0]);

    extension.bounds = new Sphere(new Vector3(0, 0, 0), 2);
    out.position = [0, 0, 8];
    extension.update(out);
    expect(out.position).toEqual([0, 0, 2]);
  });

  it('confines nothing while the Box3 or Sphere is still empty', () => {
    const out = cameraState.create();
    for (const bounds of [new Box3(), new Sphere()]) {
      out.position = [5, 0, 0];
      new ConfinerExtensionThree(bounds).update(out);
      expect(out.position).toEqual([5, 0, 0]);
    }
  });
});
