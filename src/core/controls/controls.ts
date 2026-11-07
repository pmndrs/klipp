import { degreesToRadians, vec3, type Quat, type Vec3 } from 'math';

import { withDefaults } from '../params';

import { applyAxisSettings as applyAxis } from '../input/applyAxisSettings';
import type { InputAxisData, InputAxisSettings } from '../input/axis';
import type { InputControllerConfig } from '../input/inputMapping';

export type ControlsParams = {
  /** Distance from the orbit's center while `zoom` is at its center. */
  distance: number;
  /** How close zooming in brings the camera. An orthographic view stops where dollying this close would. */
  minDistance: number;
  /** How far zooming out takes the camera. An orthographic view stops where dollying this far would. */
  maxDistance: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<ControlsParams>): ControlsParams =>
  withDefaults({ distance: 10, minDistance: 0, maxDistance: Infinity }, settings);

/** The axes of `KlippControls`, or their names. */
export type ControlsAxes<A> = { horizontal: A; vertical: A; zoom: A; panX: A; panY: A };

/** Settings of each axis. */
export type ControlsAxisSettings = {
  /** Angle around the target, in degrees. */
  horizontal?: InputAxisSettings;
  /** Elevation above the target, in degrees. */
  vertical?: InputAxisSettings;
  /** Natural log of how many times closer than `distance` the camera is. Its range follows the distance limits. */
  zoom?: Omit<InputAxisSettings, 'range' | 'wrap'>;
  /** Drag across the view in pixels, for both `panX` and `panY`. */
  pan?: Pick<InputAxisSettings, 'damping' | 'maxSpeed'>;
};

/** Default settings of each axis. Every axis starts at its `center`. */
export const createAxisSettings = (): Required<ControlsAxisSettings> => ({
  horizontal: { center: 0, range: [-180, 180], wrap: true },
  vertical: { center: 0, range: [-90, 90] },
  zoom: { center: 0 },
  pan: {},
});

/** Applies `settings` over the defaults to each axis, keeping its value. */
export function applyAxisSettings(axes: ControlsAxes<InputAxisData>, settings: ControlsAxisSettings): void {
  const defaults = createAxisSettings();
  applyAxis(axes.horizontal, defaults.horizontal, settings.horizontal);
  applyAxis(axes.vertical, defaults.vertical, settings.vertical);
  applyAxis(axes.zoom, defaults.zoom, settings.zoom);
  applyAxis(axes.panX, defaults.pan, settings.pan);
  applyAxis(axes.panY, defaults.pan, settings.pan);
}

/** Distance from the orbit's center at `zoom`. */
export const distanceAt = (params: ControlsParams, zoom: number): number => params.distance * Math.exp(-zoom);

/** The `zoom` that puts the camera `distance` away from the orbit's center. */
export const zoomAt = (params: ControlsParams, distance: number): number => Math.log(params.distance / distance);

/** `zoom`'s range between `maxDistance` and `minDistance`. */
export function zoomRange(out: [number, number], params: ControlsParams): [number, number] {
  out[0] = zoomAt(params, params.maxDistance);
  out[1] = zoomAt(params, params.minDistance);
  return out;
}

/** Height of the view at the orbit's center, in world units. `orthographicSize` is the size before `zoom`. */
export function viewHeight(
  params: ControlsParams,
  zoom: number,
  fov: number,
  orthographicSize: number,
  orthographic: boolean,
): number {
  if (orthographic) return 2 * orthographicSize * Math.exp(-zoom);
  return 2 * distanceAt(params, zoom) * Math.tan(degreesToRadians(fov) / 2);
}

const xAxis: Vec3 = [1, 0, 0];
const yAxis: Vec3 = [0, 1, 0];
const scratchUp: Vec3 = [0, 0, 0];

/**
 * How far the orbit's center moves, in world space, for a drag of `dx` and `dy` pixels seen through `rotation`: the
 * point under the cursor stays under it.
 */
export function panDelta(out: Vec3, rotation: Quat, dx: number, dy: number, worldPerPixel: number): Vec3 {
  vec3.scale(out, vec3.transformQuat(out, xAxis, rotation), -dx * worldPerPixel);
  return vec3.scaleAndAdd(out, out, vec3.transformQuat(scratchUp, yAxis, rotation), dy * worldPerPixel);
}

/**
 * Drag with the left button or one finger to orbit, with the right button or two or three fingers to pan, scroll or
 * pinch to zoom.
 */
export function inputConfig<A>({ horizontal, vertical, zoom, panX, panY }: ControlsAxes<A>): InputControllerConfig<A> {
  const orbit = { axes: { x: horizontal, y: vertical }, gain: 0.3 };
  const pan = { axes: { x: panX, y: panY } };
  return {
    mouseButtons: { left: orbit, right: pan },
    touches: { one: orbit, two: pan, three: pan },
    wheel: { axis: zoom, gain: 0.001 },
    pinch: { axis: zoom },
  };
}
