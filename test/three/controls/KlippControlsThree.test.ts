import type { Vec3 } from 'math';
import { Box3, Object3D, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { KlippControlsThree, type KlippControlsThreeOptions } from '../../../src/three/controls/KlippControlsThree';
import { GroupFramingExtensionThree } from '../../../src/three/extension/GroupFramingExtensionThree';
import { TargetGroup } from '../../../src/three/extension/TargetGroup';
import { KlippThree } from '../../../src/three/KlippThree';

function expectVec3Close(actual: Vec3, expected: Vec3) {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 8);
}

function setup(
  options: KlippControlsThreeOptions = {},
  camera: PerspectiveCamera | OrthographicCamera = new PerspectiveCamera(),
) {
  const klipp = new KlippThree(camera);
  const controls = new KlippControlsThree('orbit', options);
  klipp.add(controls);
  return { klipp, controls };
}

describe('KlippControlsThree', () => {
  it("orbits an Object3D's world position through a registry slot, released when the camera is removed", () => {
    const parent = new Object3D();
    parent.position.set(0, 5, 0);
    const player = new Object3D();
    player.position.set(2, 0, 0);
    parent.add(player);
    parent.updateMatrixWorld();
    const { klipp, controls } = setup({ target: player, distance: 4 });
    klipp.update(0.016);

    expectVec3Close(controls.state.position, [2, 5, 4]);
    expect(controls.targetSlot).not.toBeNull();
    klipp.remove(controls);
    klipp.update(0.016);
    expect(klipp.targets.has(player)).toBe(false);
  });

  it('orbits a fixed point, and the world origin without a target', () => {
    const fixed = setup({ target: new Vector3(1, 2, 3) });
    fixed.klipp.update(0.016);
    expectVec3Close(fixed.controls.state.position, [1, 2, 13]);
    expect(fixed.controls.targetSlot).toBeNull();

    const free = setup();
    free.klipp.update(0.016);
    expectVec3Close(free.controls.state.position, [0, 0, 10]);
  });

  it('stays at initialState until a ref resolves, then starts from it', () => {
    const ref = { current: null as Object3D | null };
    const { klipp, controls } = setup({ target: ref, initialState: { position: new Vector3(0, 0, 4) } });
    klipp.update(0.016);
    expectVec3Close(controls.state.position, [0, 0, 4]);

    ref.current = new Object3D();
    ref.current.position.set(0, 0, -2);
    ref.current.updateMatrixWorld();
    klipp.update(0.016);
    expectVec3Close(controls.state.position, [0, 0, 4]);
    expect(controls.zoom.value).toBeCloseTo(Math.log(10 / 6), 12);
  });

  it('takes the orbit targetOffset in three.js shorthand', () => {
    const { klipp, controls } = setup({ target: [0, 0, 0], orbit: { targetOffset: new Vector3(0, 1, 0) } });
    expect(controls.orbit.targetOffset).toEqual([0, 1, 0]);
    klipp.update(0.016);
    expectVec3Close(controls.state.position, [0, 1, 10]);
  });

  it('zooms an orthographic camera by its size', () => {
    const { klipp, controls } = setup({ initialState: { orthographicSize: 4 } }, new OrthographicCamera());
    controls.zoom.applyDelta(Math.log(2));
    klipp.update(0.016);
    expect(controls.state.orthographicSize).toBeCloseTo(2, 12);
    expectVec3Close(controls.state.position, [0, 0, 10]);
  });

  it('takes a three.js Box3 as pan bounds, read every frame', () => {
    const bounds = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const { klipp, controls } = setup({ target: new Vector3(5, 0, 0), panBounds: bounds });
    klipp.update(0.016);
    expectVec3Close(controls.state.target, [1, 0, 0]);

    bounds.max.x = 3;
    klipp.update(0.016);
    expectVec3Close(controls.state.target, [3, 0, 0]);
  });

  it('gives the pieces added to it their target slots', () => {
    const { klipp, controls } = setup();
    const member = new Object3D();
    const group = new TargetGroup([{ target: member }]);
    controls.addExtension(new GroupFramingExtensionThree(group));
    klipp.update(0.016);
    expect([...group.targetSlots.keys()]).toEqual([member]);
  });
});
