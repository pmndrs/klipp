import { vec3 } from 'math';
import type { OrthographicCamera, PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';

import * as cameraState from '../../src/core/cameraState';

import { CameraFrustumHelperThree } from '../../src/three/CameraFrustumHelperThree';

describe('CameraFrustumHelperThree', () => {
  it('follows the state, with far cut to maxDistance', () => {
    const helper = new CameraFrustumHelperThree(2);
    const state = cameraState.create();
    vec3.set(state.position, 1, 2, 3);
    state.fov = 35;
    state.far = 1000;
    helper.sync(state, 1.5);

    const camera = helper.camera as PerspectiveCamera;
    expect(camera.position.toArray()).toEqual([1, 2, 3]);
    expect(camera.fov).toBe(35);
    expect(camera.far).toBe(2);
    expect(camera.aspect).toBe(1.5);
  });

  it('draws a box for an orthographic camera, orthographicSize high and wide by aspect, and back to a frustum', () => {
    const helper = new CameraFrustumHelperThree(5);
    const state = cameraState.create();
    vec3.set(state.position, 1, 2, 3);
    state.orthographicSize = 2;
    helper.sync(state, 1.5, true);

    const box = helper.camera as OrthographicCamera;
    expect(box.isOrthographicCamera).toBe(true);
    expect([box.left, box.right, box.top, box.bottom, box.far]).toEqual([-3, 3, 2, -2, 5]);
    expect(box.position.toArray()).toEqual([1, 2, 3]);
    expect(helper.matrix).toBe(box.matrixWorld);

    helper.sync(state, 1.5);
    expect((helper.camera as PerspectiveCamera).isPerspectiveCamera).toBe(true);
    expect(helper.camera.position.toArray()).toEqual([1, 2, 3]);
    expect(helper.matrix).toBe(helper.camera.matrixWorld);
  });

  it('redraws only when the pose or lens changed', () => {
    const helper = new CameraFrustumHelperThree();
    const update = vi.spyOn(helper, 'update');
    const state = cameraState.create();

    helper.sync(state, 1);
    helper.sync(state, 1);
    expect(update).toHaveBeenCalledTimes(1);

    state.position[0] = 5;
    helper.sync(state, 1);
    helper.sync(state, 2);
    expect(update).toHaveBeenCalledTimes(3);
  });
});
