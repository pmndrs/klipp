import type { Camera } from 'three';

import * as cameraState from '../core/cameraState';
import type { CameraState } from '../core/cameraState';
import { Klipp, type KlippOptions } from '../core/Klipp';

import {
  isOrthographicCamera,
  isPerspectiveCamera,
  readCameraState,
  writeCameraLens,
  writeCameraTransform,
} from './camera';

import { TargetRegistry } from './resolve/TargetRegistry';

export type KlippThreeOptions = Omit<KlippOptions, 'initialCameraState'>;

/** The original pose and lens per camera, so a later `KlippThree` on the same camera does not inherit stale state. */
const pristineCameraStates = new WeakMap<Camera, CameraState>();

function pristineStateOf(camera: Camera): CameraState {
  let pristine = pristineCameraStates.get(camera);
  if (!pristine) {
    pristine = cameraState.create();
    if (isPerspectiveCamera(camera) || isOrthographicCamera(camera)) readCameraState(pristine, camera);
    pristineCameraStates.set(camera, pristine);
  }
  return pristine;
}

/** `Klipp` for three.js: reads `Object3D` targets once per frame and writes the shot to a camera. */
export class KlippThree extends Klipp {
  /** Reads every target once per frame for all the pieces that follow it. */
  readonly targets = new TargetRegistry();
  private _camera: Camera;

  constructor(camera: Camera, options: KlippThreeOptions = {}) {
    super({ ...options, initialCameraState: pristineStateOf(camera) });
    this._camera = camera;
    this.orthographic = isOrthographicCamera(camera);
  }

  /** The camera to drive, perspective or orthographic. New virtual cameras start from its pose and lens. */
  get camera(): Camera {
    return this._camera;
  }

  /** A new camera gets the current shot on the next frame, even if the shot did not change. */
  set camera(camera: Camera) {
    if (camera === this._camera) return;
    pristineStateOf(camera);
    this._camera = camera;
    this.orthographic = isOrthographicCamera(camera);
    this.requestWrite();
  }

  protected override prepareFrame(): void {
    super.prepareFrame();
    this.targets.refresh();
  }

  protected override write(result: CameraState, transformChanged: boolean, lensChanged: boolean): void {
    const camera = this._camera;
    if (transformChanged) writeCameraTransform(camera, result);
    if (lensChanged && (isPerspectiveCamera(camera) || isOrthographicCamera(camera))) {
      // The view offset is a ratio of the viewport, so any size works until setSize.
      writeCameraLens(camera, result, this.width || 1, this.height || 1);
    }
  }
}
