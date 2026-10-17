import type { Vec3 } from 'math';
import { Euler, Object3D, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';

import { OrbitFollowBodyThree } from '../../../src/three/body/OrbitFollowBodyThree';

function expectVec3Close(actual: Vec3, expected: Vec3) {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 8);
}

function orbit(body: OrbitFollowBodyThree) {
  const out = cameraState.create();
  body.update(out, 0.016, false);
  return out;
}

describe('OrbitFollowBodyThree', () => {
  it('orbits a fixed point', () => {
    const out = orbit(new OrbitFollowBodyThree(new Vector3(1, 2, 3)));
    expectVec3Close(out.position, [1, 2, 13]);
    expectVec3Close(out.target, [1, 2, 3]);
  });

  it("orbits an Object3D's world position, rotating the orbit with it in lockToTarget", () => {
    const parent = new Object3D();
    parent.position.set(0, 5, 0);
    const child = new Object3D();
    child.position.set(2, 0, 0);
    child.rotation.y = Math.PI / 2;
    parent.add(child);
    parent.updateMatrixWorld();

    const out = orbit(new OrbitFollowBodyThree(child, { bindingMode: 'lockToTarget' }));
    expectVec3Close(out.position, [12, 5, 0]);
  });

  it('follows a ref once it resolves', () => {
    const ref = { current: null as Object3D | null };
    const body = new OrbitFollowBodyThree(ref);
    const out = orbit(body);
    expect(out.hasTarget).toBe(false);

    ref.current = new Object3D();
    ref.current.position.set(0, 0, -4);
    ref.current.updateMatrixWorld();
    body.update(out, 0.016, false);
    expectVec3Close(out.position, [0, 0, 6]);
  });

  it('takes targetOffset as a Vector3, a tuple or one number', () => {
    expect(new OrbitFollowBodyThree(null, { targetOffset: new Vector3(1, 2, 3) }).targetOffset).toEqual([1, 2, 3]);
    expect(new OrbitFollowBodyThree(null, { targetOffset: [0, 1.5] }).targetOffset).toEqual([0, 1.5, 0]);
    expect(new OrbitFollowBodyThree(null, { targetOffset: 2 }).targetOffset).toEqual([2, 2, 2]);
    expect(new OrbitFollowBodyThree(null).targetOffset).toEqual([0, 0, 0]);
  });

  it('setFromPosition and setFromRotation take a Vector3 and a Quaternion', () => {
    const fromPosition = new OrbitFollowBodyThree([0, 0, 0]);
    fromPosition.setFromPosition(new Vector3(-3, 3, 0));
    expect(fromPosition.horizontal.rawValue).toBeCloseTo(90, 6);
    expect(fromPosition.vertical.rawValue).toBeCloseTo(45, 6);

    const fromRotation = new OrbitFollowBodyThree([0, 0, 0]);
    fromRotation.setFromRotation(new Quaternion().setFromEuler(new Euler(-Math.PI / 6, Math.PI / 2, 0, 'YXZ')));
    expect(fromRotation.horizontal.rawValue).toBeCloseTo(-90, 6);
    expect(fromRotation.vertical.rawValue).toBeCloseTo(30, 6);
  });
});
