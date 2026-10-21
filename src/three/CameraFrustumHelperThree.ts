import { CameraHelper, OrthographicCamera, PerspectiveCamera, Quaternion, Vector3 } from 'three';

import type { CameraState } from '../core/cameraState';

const scratchPosition = new Vector3();
const scratchQuaternion = new Quaternion();

/** A `CameraHelper` that draws a virtual camera's frustum from its `state`. */
export class CameraFrustumHelperThree extends CameraHelper {
  /** How far the frustum is drawn. */
  maxDistance: number;

  private readonly perspectiveCamera: PerspectiveCamera;
  private readonly orthographicCamera = new OrthographicCamera();
  private readonly lens = { fov: NaN, orthographicSize: NaN, near: NaN, far: NaN, aspect: NaN };

  constructor(maxDistance = 1) {
    const perspectiveCamera = new PerspectiveCamera();
    super(perspectiveCamera);
    this.perspectiveCamera = perspectiveCamera;
    this.maxDistance = maxDistance;
  }

  /** Follow `state`, seen at `aspect` through a perspective or orthographic camera. Redraws only on a change. */
  sync(state: CameraState, aspect: number, orthographic = false): void {
    const camera = orthographic ? this.orthographicCamera : this.perspectiveCamera;
    const projectionChanged = camera !== this.camera;
    if (projectionChanged) {
      this.camera = camera;
      this.matrix = camera.matrixWorld;
    }

    const far = Math.min(state.far, this.maxDistance);
    const lens = this.lens;
    const lensChanged =
      projectionChanged ||
      lens.fov !== state.fov ||
      lens.orthographicSize !== state.orthographicSize ||
      lens.near !== state.near ||
      lens.far !== far ||
      lens.aspect !== aspect;
    if (lensChanged) {
      lens.fov = state.fov;
      lens.orthographicSize = state.orthographicSize;
      lens.aspect = aspect;
      camera.near = lens.near = state.near;
      camera.far = lens.far = far;
      if (camera === this.orthographicCamera) {
        camera.top = state.orthographicSize;
        camera.bottom = -state.orthographicSize;
        camera.right = state.orthographicSize * aspect;
        camera.left = -state.orthographicSize * aspect;
      } else {
        this.perspectiveCamera.fov = state.fov;
        this.perspectiveCamera.aspect = aspect;
      }
      camera.updateProjectionMatrix();
    }

    scratchPosition.fromArray(state.position);
    scratchQuaternion.fromArray(state.quaternion);
    const transformChanged =
      projectionChanged || !camera.position.equals(scratchPosition) || !camera.quaternion.equals(scratchQuaternion);
    if (transformChanged) {
      camera.position.copy(scratchPosition);
      camera.quaternion.copy(scratchQuaternion);
      camera.updateMatrixWorld(true);
    }

    if (lensChanged || transformChanged) this.update();
  }
}
