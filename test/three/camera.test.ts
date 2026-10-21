import { vec3 } from 'math';
import { OrthographicCamera, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../src/core/cameraState';

import { writeCameraState, readCameraState } from '../../src/three/camera';

import { toQuaternion, toVector3 } from '../tuples';

describe('readCameraState', () => {
  it('copies transform and lens, and clears what a real camera has no opinion on', () => {
    const camera = new PerspectiveCamera(60, 1, 0.5, 500);
    camera.position.set(3, 4, 5);
    camera.lookAt(0, 0, 0);
    const out = cameraState.create();
    Object.assign(out, { hasTarget: true, hasLookAtTarget: true });
    vec3.set(out.referenceUp, 1, 0, 0);

    readCameraState(out, camera);
    camera.position.set(50, 50, 50);

    expect(out.position).toEqual([3, 4, 5]);
    expect(toQuaternion(out.quaternion).equals(camera.quaternion)).toBe(true);
    expect(out).toMatchObject({ fov: 60, near: 0.5, far: 500, hasTarget: false, hasLookAtTarget: false });
    expect(out.referenceUp).toEqual([0, 1, 0]);
  });

  it("reads viewOffset in screenPosition's convention, +X right (real bug: three's offsetX points left), and as zero once cleared", () => {
    const camera = new PerspectiveCamera(60, 1, 0.5, 500);
    const read = () => [...readCameraState(cameraState.create(), camera).viewOffset];

    expect(read()).toEqual([0, 0]);
    camera.setViewOffset(800, 600, 80, -60, 800, 600);
    expect(read()).toEqual([-0.2, -0.2]);
    camera.clearViewOffset();
    expect(read()).toEqual([0, 0]);
  });

  it("reads an orthographic camera's visible half-height as orthographicSize, and keeps the default for an empty frustum", () => {
    const camera = new OrthographicCamera(-400, 400, 300, -300, 0.5, 500);
    camera.zoom = 50;
    const out = readCameraState(cameraState.create(), camera);
    expect(out).toMatchObject({ orthographicSize: 6, fov: 50, near: 0.5, far: 500 });

    expect(readCameraState(cameraState.create(), new OrthographicCamera(0, 0, 0, 0)).orthographicSize).toBe(1);
  });
});

describe('writeCameraState', () => {
  it('writes transform and lens, and updates the projection matrix', () => {
    const state = cameraState.create();
    vec3.set(state.position, 3, 4, 5);
    new Quaternion(0.1, 0.2, 0.3, 0.9).normalize().toArray(state.quaternion);
    Object.assign(state, { fov: 90, near: 0.5, far: 500 });
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    const projection = camera.projectionMatrix.clone();

    writeCameraState(camera, state, 800, 600);

    expect(camera.position.equals(toVector3(state.position))).toBe(true);
    expect(camera.quaternion.equals(toQuaternion(state.quaternion))).toBe(true);
    expect([camera.fov, camera.near, camera.far]).toEqual([90, 0.5, 500]);
    expect(camera.projectionMatrix.equals(projection)).toBe(false);
  });

  it('a positive viewOffset[0] shifts the frame so a point ahead lands right of center (real bug: raw setViewOffset does the opposite), and [0, 0] clears it', () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    const state = cameraState.create();
    state.viewOffset[0] = 0.3;

    writeCameraState(camera, state, 800, 600);
    camera.updateMatrixWorld(true);
    expect(new Vector3(0, 0, -10).project(camera).x).toBeGreaterThan(0);

    state.viewOffset[0] = 0;
    writeCameraState(camera, state, 800, 600);
    expect(camera.view?.enabled).toBe(false);
  });

  it("gives an orthographic camera orthographicSize through zoom, keeping its frustum, so a point that far up lands on the frame's top edge", () => {
    const camera = new OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
    const state = cameraState.create();
    state.orthographicSize = 4;

    writeCameraState(camera, state, 800, 600);
    camera.updateMatrixWorld(true);

    expect([camera.left, camera.right, camera.top, camera.bottom]).toEqual([-400, 400, 300, -300]);
    expect(camera.zoom).toBe(75);
    expect(new Vector3(0, 4, -10).project(camera).y).toBeCloseTo(1, 10);
  });

  it("leaves an orthographic camera's zoom alone while its frustum is empty", () => {
    const camera = new OrthographicCamera(0, 0, 0, 0);
    writeCameraState(camera, cameraState.create(), 800, 600);
    expect(camera.zoom).toBe(1);
  });

  it('round-trips through readCameraState', () => {
    const state = cameraState.create();
    vec3.set(state.position, 1, 2, 3);
    new Quaternion(0.1, 0.2, 0.3, 0.9).normalize().toArray(state.quaternion);
    state.fov = 70;
    state.viewOffset[0] = 0.5;
    state.viewOffset[1] = -0.25;
    const camera = new PerspectiveCamera();

    writeCameraState(camera, state, 800, 600);
    const readBack = readCameraState(cameraState.create(), camera);

    expect(readBack.position).toEqual([1, 2, 3]);
    expect(toQuaternion(readBack.quaternion).equals(toQuaternion(state.quaternion))).toBe(true);
    expect(readBack.fov).toBe(70);
    expect(readBack.viewOffset).toEqual([0.5, -0.25]);
  });

  it('round-trips an orthographic camera through readCameraState', () => {
    const state = cameraState.create();
    state.orthographicSize = 2.5;
    state.viewOffset[0] = 0.5;
    const camera = new OrthographicCamera(-1, 1, 1, -1);

    writeCameraState(camera, state, 800, 600);
    const readBack = readCameraState(cameraState.create(), camera);

    expect(readBack.orthographicSize).toBe(2.5);
    expect(readBack.fov).toBe(50);
    expect(readBack.viewOffset).toEqual([0.5, 0]);
  });
});
