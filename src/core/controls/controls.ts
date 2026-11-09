import { degreesToRadians, quat, vec3, type Quat, type Vec3 } from 'math';
import { box3, type Box3 } from 'math/shapes';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import * as damping from '../damping/damping';
import type { DampingConstant, Vector3DamperState } from '../damping/damping';
import { applyAxisSettings as applyAxis } from '../input/applyAxisSettings';
import type { EaseOptions, InputAxisData, InputAxisSettings } from '../input/axis';
import type { InputControllerConfig } from '../input/inputMapping';

export type ControlsParams = {
  /** Distance from the orbit's center while `zoom` is at its center. */
  distance: number;
  /** How close zooming in brings the camera. An orthographic view stops where dollying this close would. */
  minDistance: number;
  /** How far zooming out takes the camera. An orthographic view stops where dollying this far would. */
  maxDistance: number;
  /**
   * Width of the zone inside the edge of the pan bounds where panning toward it slows down, in world units. `0` stops
   * it at the edge.
   */
  panSlowingDistance: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<ControlsParams>): ControlsParams =>
  withDefaults({ distance: 10, minDistance: 0, maxDistance: Infinity, panSlowingDistance: 0 }, settings);

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

/** Height of the view `distance` in front of the camera, in world units. */
export function viewHeight(
  view: Pick<CameraState, 'fov' | 'orthographicSize'>,
  distance: number,
  orthographic: boolean,
): number {
  return orthographic ? 2 * view.orthographicSize : 2 * distance * Math.tan(degreesToRadians(view.fov) / 2);
}

/** How far from the center of a sphere of `radius` a view with this `fov` and `aspect` just holds all of it. */
export function fitSphereDistance(radius: number, fov: number, aspect: number): number {
  const vertical = degreesToRadians(fov) / 2;
  const horizontal = Math.atan(Math.tan(vertical) * aspect);
  return radius / Math.sin(Math.min(vertical, horizontal));
}

/** The `orthographicSize` of a view with this `aspect` that just holds a sphere of `radius`. */
export const fitSphereSize = (radius: number, aspect: number): number => radius / Math.min(1, aspect);

const scratchPoint: Vec3 = [0, 0, 0];
const scratchView: Quat = [0, 0, 0, 1];
const scratchBox: Box3 = box3.create();
const scratchCorners: number[] = new Array<number>(24).fill(0);
const origin: Vec3 = [0, 0, 0];

/** The middle of the box around the first `count` of `points`, flat `[x, y, z, ...]`. */
export function pointsCenter(out: Vec3, points: ArrayLike<number>, count: number): Vec3 {
  box3.empty(scratchBox);
  for (let i = 0; i < count; i++) {
    box3.expandByPoint(scratchBox, scratchBox, vec3.fromBuffer(scratchPoint, points, i * 3));
  }
  return box3.center(out, scratchBox);
}

/** Point `index` of `points` around `center`, in camera space, with `scratchView` holding the inverse rotation. */
function pointInView(out: Vec3, points: ArrayLike<number>, index: number, center: Vec3): Vec3 {
  vec3.subtract(out, vec3.fromBuffer(out, points, index * 3), center);
  return vec3.transformQuat(out, out, scratchView);
}

/**
 * How far from `center` a view turned by `rotation`, with this `fov` and `aspect`, just holds each of the first `count`
 * of `points`, flat `[x, y, z, ...]`, with `padding` around each.
 */
export function fitPointsDistance(
  points: ArrayLike<number>,
  count: number,
  center: Vec3,
  rotation: Quat,
  fov: number,
  aspect: number,
  padding = 0,
): number {
  const tanVertical = Math.tan(degreesToRadians(fov) / 2);
  const tanHorizontal = tanVertical * aspect;
  quat.conjugate(scratchView, rotation);
  let distance = 0;
  for (let i = 0; i < count; i++) {
    const point = pointInView(scratchPoint, points, i, center);
    const reach = Math.max(
      (Math.abs(point[0]) + padding) / tanHorizontal,
      (Math.abs(point[1]) + padding) / tanVertical,
    );
    distance = Math.max(distance, point[2] + padding + reach);
  }
  return distance;
}

/**
 * The `orthographicSize` of a view turned by `rotation`, with this `aspect`, that just holds each of the first `count`
 * of `points`, with `padding` around each.
 */
export function fitPointsSize(
  points: ArrayLike<number>,
  count: number,
  center: Vec3,
  rotation: Quat,
  aspect: number,
  padding = 0,
): number {
  quat.conjugate(scratchView, rotation);
  let size = 0;
  for (let i = 0; i < count; i++) {
    const point = pointInView(scratchPoint, points, i, center);
    size = Math.max(size, Math.abs(point[1]) + padding, (Math.abs(point[0]) + padding) / aspect);
  }
  return size;
}

/** The corners of a box with `halfExtents` around the origin, flat `[x, y, z, ...]`. */
function boxCorners(halfExtents: Vec3): number[] {
  for (let i = 0; i < 8; i++) {
    scratchCorners[i * 3] = i & 1 ? halfExtents[0] : -halfExtents[0];
    scratchCorners[i * 3 + 1] = i & 2 ? halfExtents[1] : -halfExtents[1];
    scratchCorners[i * 3 + 2] = i & 4 ? halfExtents[2] : -halfExtents[2];
  }
  return scratchCorners;
}

/**
 * How far from the center of a box with `halfExtents` a view turned by `rotation`, with this `fov` and `aspect`, just
 * holds every corner.
 */
export const fitBoxDistance = (halfExtents: Vec3, rotation: Quat, fov: number, aspect: number): number =>
  fitPointsDistance(boxCorners(halfExtents), 8, origin, rotation, fov, aspect);

/** The `orthographicSize` of a view turned by `rotation`, with this `aspect`, that just holds every corner of a box. */
export const fitBoxSize = (halfExtents: Vec3, rotation: Quat, aspect: number): number =>
  fitPointsSize(boxCorners(halfExtents), 8, origin, rotation, aspect);

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
 * pinch to zoom. Each source in `overrides` replaces its default, and `null` turns it off.
 */
export function inputConfig<A>(
  { horizontal, vertical, zoom, panX, panY }: ControlsAxes<A>,
  overrides: InputControllerConfig<A> = {},
): InputControllerConfig<A> {
  const orbit = { axes: { x: horizontal, y: vertical }, gain: 0.3 };
  const pan = { axes: { x: panX, y: panY } };
  return {
    mouseButtons: { left: orbit, right: pan, ...overrides.mouseButtons },
    touches: { one: orbit, two: pan, three: pan, ...overrides.touches },
    wheel: overrides.wheel === undefined ? { axis: zoom, gain: 0.001 } : overrides.wheel,
    pinch: overrides.pinch === undefined ? { axis: zoom } : overrides.pinch,
  };
}

/** How `fit` and `fitPoints` frame a shape. */
export type ControlsFitOptions = EaseOptions & {
  /** Room left around the shape, in world units. */
  padding?: number;
};

/** A move of the pan to a set value, eased with its own damping. */
export type PanTransition = {
  active: boolean;
  damping: DampingConstant;
  goal: Vec3;
  damper: Vector3DamperState;
};

export const createPanTransition = (): PanTransition => ({
  active: false,
  damping: 0,
  goal: [0, 0, 0],
  damper: damping.createVector3State(),
});

/** Moves `pan` to `goal`: right away without damping, or eased from the next `stepPan` on. */
export function startPan(transition: PanTransition, pan: Vec3, goal: Vec3, time: DampingConstant): void {
  vec3.copy(transition.goal, goal);
  transition.damping = time;
  if (typeof time === 'number' && time <= 0) {
    transition.active = false;
    vec3.copy(pan, goal);
    return;
  }
  transition.active = true;
  damping.startVector3(transition.damper);
}

/** Eases `pan` toward the goal of `transition`. Returns `true` while it still has to move. */
export function stepPan(transition: PanTransition, pan: Vec3, dt: number): boolean {
  if (!transition.active) return false;
  damping.dampVector3(pan, transition.damper, transition.goal, transition.damping, dt);
  transition.active = !vec3.exactEquals(pan, transition.goal);
  return transition.active;
}
