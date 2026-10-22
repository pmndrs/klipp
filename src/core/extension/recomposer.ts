import { degreesToRadians, quat, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

export type RecomposerParams = {
  /** Turns the camera around its own horizontal axis, in degrees: positive looks down, like `PanTilt`. */
  tilt: number;
  /** Turns the camera around `referenceUp`, in degrees: positive turns right, like `PanTilt`. */
  pan: number;
  /** Rolls the camera around its view direction, in degrees: positive leans it to the right. */
  dutch: number;
  /** Multiplies the field of view, up to 179°, and `orthographicSize`: below `1` zooms in, above `1` zooms out. */
  zoomScale: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<RecomposerParams>): RecomposerParams =>
  withDefaults({ tilt: 0, pan: 0, dutch: 0, zoomScale: 1 }, settings);

const MIN_ZOOM_SCALE = 0.01;
const MAX_FOV = 179;

const rightAxis: Vec3 = [1, 0, 0];
const forwardAxis: Vec3 = [0, 0, -1];
const scratchRotation: Quat = [0, 0, 0, 1];

/** Turns, rolls and zooms `out` by `params`. */
export function update(out: CameraState, params: RecomposerParams): void {
  const { tilt, pan, dutch } = params;
  const rotation = out.quaternion;
  if (tilt !== 0) {
    quat.multiply(rotation, rotation, quat.setAxisAngle(scratchRotation, rightAxis, -degreesToRadians(tilt)));
  }
  if (pan !== 0) {
    quat.multiply(rotation, quat.setAxisAngle(scratchRotation, out.referenceUp, -degreesToRadians(pan)), rotation);
  }
  if (dutch !== 0) {
    quat.multiply(rotation, rotation, quat.setAxisAngle(scratchRotation, forwardAxis, degreesToRadians(dutch)));
  }
  const zoomScale = Math.max(MIN_ZOOM_SCALE, params.zoomScale);
  out.fov = Math.min(out.fov * zoomScale, MAX_FOV);
  out.orthographicSize *= zoomScale;
}
