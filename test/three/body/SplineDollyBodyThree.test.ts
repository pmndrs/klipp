import { CatmullRomCurve3, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import * as spline from '../../../src/core/spline';

import { SplineDollyBodyThree } from '../../../src/three/body/SplineDollyBodyThree';

const line = spline.create([
  [0, 0, 0],
  [10, 0, 0],
]);

describe('SplineDollyBodyThree', () => {
  it("keeps up with an Object3D's world position and publishes it as out.target", () => {
    const parent = new Object3D();
    parent.position.set(1, 0, 0);
    const target = new Object3D();
    target.position.set(5, 4, 2);
    parent.add(target);
    parent.updateMatrixWorld();
    const out = cameraState.create();

    new SplineDollyBodyThree({
      target,
      spline: line,
      automaticDolly: { method: 'nearestPointToTarget' },
    }).update(out, 0.1, true);

    expect(out.position[0]).toBeCloseTo(6, 2);
    expect(out.target).toEqual([6, 4, 2]);
    expect(out.hasTarget).toBe(true);
  });

  it('takes its path as a CatmullRomCurve3 or as points, and its offset as a Vector3', () => {
    const fromCurve = new SplineDollyBodyThree({
      spline: new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(10, 0, 0)]),
      splineOffset: new Vector3(0, 1, 0),
    });
    const fromPoints = new SplineDollyBodyThree({
      spline: [
        [0, 0, 0],
        [10, 0, 0],
        [10, 0, 10],
      ],
      closed: true,
    });

    expect(fromCurve.spline?.length).toBeCloseTo(10, 6);
    expect(fromCurve.splineOffset).toEqual([0, 1, 0]);
    expect(fromPoints.spline?.closed).toBe(true);
    expect(fromPoints.spline?.segmentCount).toBe(3);

    const out = cameraState.create();
    fromCurve.update(out, 0.1, true);
    expect(out.position[1]).toBeCloseTo(1, 6);
  });
});
