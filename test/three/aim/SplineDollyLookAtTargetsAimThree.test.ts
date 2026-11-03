import { Object3D, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as spline from '../../../src/core/spline';
import { SplineDollyBody } from '../../../src/core/body/SplineDollyBody';

import { SplineDollyLookAtTargetsAimThree } from '../../../src/three/aim/SplineDollyLookAtTargetsAimThree';
import { SplineDollyBodyThree } from '../../../src/three/body/SplineDollyBodyThree';
import { KlippThree } from '../../../src/three/KlippThree';
import { VirtualCameraThree } from '../../../src/three/VirtualCameraThree';

describe('SplineDollyLookAtTargetsAimThree', () => {
  it('looks at Object3Ds and fixed points, and skips refs that are not set yet', () => {
    const target = new Object3D();
    target.position.set(0, 0, 5);
    target.updateMatrixWorld();
    const aim = new SplineDollyLookAtTargetsAimThree({
      targets: [
        { position: 0, lookAt: target },
        { position: 0.5, lookAt: { current: null } },
        { position: 1, lookAt: [10, 0, 5] },
      ],
    });
    const dolly = new SplineDollyBody({
      spline: spline.create([
        [0, 0, 0],
        [10, 0, 0],
      ]),
      position: 0.5,
    });
    aim.cameraBody = dolly;
    const out = cameraState.create();
    dolly.update(out, 1 / 60, true);
    aim.update(out);
    expect(aim.state.lookAt.map((v) => Number(v.toFixed(6)))).toEqual([5, 0, 7.071068]);
  });

  it('reads its Object3D targets through the target registry, and gives them back once removed', () => {
    const klipp = new KlippThree(new PerspectiveCamera());
    const camera = new VirtualCameraThree('dolly');
    klipp.add(camera);
    const door = new Object3D();
    door.position.set(5, 0, 5);
    const aim = new SplineDollyLookAtTargetsAimThree({
      targets: [
        { position: 0, lookAt: door },
        { position: 1, lookAt: [10, 0, 5] },
      ],
    });
    camera.body = new SplineDollyBodyThree({
      spline: [
        [0, 0, 0],
        [10, 0, 0],
      ],
    });
    camera.aim = aim;
    klipp.update(0.1);
    expect([...aim.targetSlots.keys()]).toEqual([door]);
    expect(klipp.targets.has(door)).toBe(true);
    expect(aim.state.lookAt).toEqual([5, 0, 5]);

    camera.aim = null;
    klipp.update(0.1);
    expect(aim.targetSlots.size).toBe(0);
    expect(klipp.targets.has(door)).toBe(false);
  });
});
