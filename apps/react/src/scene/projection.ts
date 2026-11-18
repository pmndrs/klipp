import { useControls } from 'leva';

type Get = (path: string) => unknown;

/** `render` for a leva control that only matters to an orthographic camera, picked by `CameraSelect`. */
export const whenOrthographic = (get: Get): boolean => get('camera') === 'orthographic';

/** `render` for a leva control that only matters to a perspective camera, picked by `CameraSelect`. */
export const whenPerspective = (get: Get): boolean => get('camera') !== 'orthographic';

/** The `orthographicSize` that frames like the examples' 50° perspective camera at `distance`. */
export const framingSize = (distance: number): number => distance * Math.tan((25 * Math.PI) / 180);

/** An `orthographicSize` control in the example's `folder`, shown only for an orthographic camera. */
export function useOrthographicSize(folder: string, value: number): number {
  const { orthographicSize } = useControls(folder, {
    orthographicSize: { value, min: 0.5, max: Math.ceil(value * 3), step: 0.1, render: whenOrthographic },
  });
  return orthographicSize;
}
