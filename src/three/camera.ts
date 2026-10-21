import { vec3 } from 'math';
import type { Camera, Object3D, OrthographicCamera, PerspectiveCamera } from 'three';

import type { CameraState } from '../core/cameraState';

/** `three` can load twice in monorepos; `instanceof` then fails. Use the camera's own flag instead. */
export function isPerspectiveCamera(camera: Camera): camera is PerspectiveCamera {
  return (camera as PerspectiveCamera).isPerspectiveCamera === true;
}

export function isOrthographicCamera(camera: Camera): camera is OrthographicCamera {
  return (camera as OrthographicCamera).isOrthographicCamera === true;
}

/** Read a perspective or orthographic camera's transform and lens into `out`. */
export function readCameraState(out: CameraState, camera: PerspectiveCamera | OrthographicCamera): CameraState {
  camera.position.toArray(out.position);
  camera.quaternion.toArray(out.quaternion);
  if (isOrthographicCamera(camera)) {
    const height = camera.top - camera.bottom;
    if (height > 0) out.orthographicSize = height / (2 * camera.zoom);
  } else {
    out.fov = camera.fov;
  }
  out.near = camera.near;
  out.far = camera.far;
  // three.js stores the viewport dimensions needed to normalize its offset.
  out.viewOffset[0] = camera.view?.enabled ? -camera.view.offsetX / (camera.view.fullWidth / 2) : 0;
  out.viewOffset[1] = camera.view?.enabled ? camera.view.offsetY / (camera.view.fullHeight / 2) : 0;
  out.hasTarget = false;
  out.hasLookAtTarget = false;
  vec3.set(out.referenceUp, 0, 1, 0);
  return out;
}

/** Write a camera state's position and rotation to a camera. */
export function writeCameraTransform(camera: Object3D, state: CameraState): void {
  camera.position.fromArray(state.position);
  camera.quaternion.fromArray(state.quaternion);
}

/**
 * Write a camera state's lens and view offset to a perspective or orthographic camera. An orthographic camera keeps
 * its frustum and gets `orthographicSize` through `zoom`.
 */
export function writeCameraLens(
  camera: PerspectiveCamera | OrthographicCamera,
  state: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): void {
  if (isOrthographicCamera(camera)) {
    // An empty frustum, like R3F's before it knows the canvas size, has no zoom that fits.
    const height = camera.top - camera.bottom;
    if (height > 0) camera.zoom = height / (2 * state.orthographicSize);
  } else {
    camera.fov = state.fov;
  }
  camera.near = state.near;
  camera.far = state.far;
  // These methods also update the projection matrix.
  if (state.viewOffset[0] !== 0 || state.viewOffset[1] !== 0) {
    // three.js uses the opposite horizontal offset convention.
    const offsetX = -state.viewOffset[0] * (viewportWidth / 2);
    const offsetY = state.viewOffset[1] * (viewportHeight / 2);
    camera.setViewOffset(viewportWidth, viewportHeight, offsetX, offsetY, viewportWidth, viewportHeight);
  } else {
    camera.clearViewOffset();
  }
}

/** Write a camera state to a perspective or orthographic camera. */
export function writeCameraState(
  camera: PerspectiveCamera | OrthographicCamera,
  state: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): void {
  writeCameraTransform(camera, state);
  writeCameraLens(camera, state, viewportWidth, viewportHeight);
}
