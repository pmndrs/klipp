/** Fields the camera keeps up to date on its pieces every frame. */
type CameraFields = 'aspect' | 'freeHeight' | 'orthographic';

/** `params` without the fields the camera keeps up to date, so a render leaves them as the camera set them. */
export function withoutCameraFields<T extends Partial<Record<CameraFields, unknown>>>(
  params: T,
): Omit<T, CameraFields> {
  const { aspect: _aspect, freeHeight: _freeHeight, orthographic: _orthographic, ...rest } = params;
  return rest;
}
