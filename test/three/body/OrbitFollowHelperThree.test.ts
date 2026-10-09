import { Color, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/CameraState';

import { OrbitFollowBodyThree } from '../../../src/three/body/OrbitFollowBodyThree';
import { OrbitFollowHelperThree } from '../../../src/three/body/OrbitFollowHelperThree';

function drawn(helper: OrbitFollowHelperThree): Vector3[] {
  const attribute = helper.geometry.getAttribute('position');
  const points: Vector3[] = [];
  for (let i = 0; i < helper.geometry.drawRange.count; i++)
    points.push(new Vector3().fromBufferAttribute(attribute, i));
  return points;
}

describe('OrbitFollowHelperThree', () => {
  it('draws a circle and an arc on the sphere around the target', () => {
    const target = new Vector3(1, 2, 3);
    const body = new OrbitFollowBodyThree(target, { radius: 4 });
    body.update(cameraState.create(), 0.016, false);
    const helper = new OrbitFollowHelperThree();
    helper.sync(body);

    const points = drawn(helper);
    expect(points.length).toBe((64 + 32) * 2);
    for (const point of points) expect(point.distanceTo(target)).toBeCloseTo(4, 4);
  });

  it('adds the three rings for threeRing', () => {
    const body = new OrbitFollowBodyThree(new Vector3(), { orbitStyle: 'threeRing' });
    body.update(cameraState.create(), 0.016, false);
    const helper = new OrbitFollowHelperThree();
    helper.sync(body);

    const points = drawn(helper);
    expect(points.length).toBe((64 * 4 + 32) * 2);
    const heights = new Set(points.slice(0, 64 * 6).map((point) => Math.round(point.y)));
    expect([...heights].sort((a, b) => a - b)).toEqual([-10, 0, 10]);
  });

  it('colors the horizontal circle, the vertical arc and the rings apart', () => {
    const body = new OrbitFollowBodyThree(new Vector3(), { orbitStyle: 'threeRing' });
    body.update(cameraState.create(), 0.016, false);
    const helper = new OrbitFollowHelperThree();
    helper.sync(body);

    const colors = helper.geometry.getAttribute('color');
    const expectColor = (vertex: number, expected: Color) =>
      expect(new Color().fromBufferAttribute(colors, vertex).toArray()).toEqual(
        expected.toArray().map((channel) => expect.closeTo(channel, 6)),
      );
    expectColor(0, helper.colors.rings);
    expectColor(64 * 6, helper.colors.horizontal);
    expectColor(64 * 8, helper.colors.vertical);
  });

  it('follows the camera that moves with the target', () => {
    const target = new Vector3();
    const body = new OrbitFollowBodyThree(target, { radius: 4 });
    const helper = new OrbitFollowHelperThree();
    const out = cameraState.create();
    body.update(out, 0.016, false);
    target.set(10, 0, 0);
    body.update(out, 0.016, false);
    helper.sync(body);
    for (const point of drawn(helper)) expect(point.distanceTo(target)).toBeCloseTo(4, 4);
  });
});
