import { clamp, quat, vec3, type Quat, type Vec3 } from 'math';
import { box3, type Box3, type Sphere } from 'math/shapes';

import * as cameraState from '../cameraState';
import * as targetPose from '../targetPose';
import type { CameraState } from '../cameraState';
import { inherit, prepare, run, skip, subscribeFrameEnd } from '../internal';
import type { CameraTransitionEventMap } from '../klippState';
import type { TargetPose } from '../targetPose';
import { VirtualCamera, type AimPiece, type BodyPiece, type ExtensionPiece } from '../VirtualCamera';
import type { VirtualCameraOptions } from '../VirtualCameraBase';

import * as hardLookAt from '../aim/hardLookAt';
import * as orbitFollow from '../body/orbitFollow';
import * as tracker from '../body/tracker';
import * as confiner from '../extension/confiner';
import * as inputAxis from '../input/axis';
import type { OrbitFollowParams } from '../body/orbitFollow';
import { OrbitFollowBody } from '../body/OrbitFollowBody';
import type { DampingConstant } from '../damping/damping';
import type { ConfinerBounds } from '../extension/confiner';
import type { EaseOptions } from '../input/axis';
import { InputAxis } from '../input/InputAxis';
import type { InputControllerConfig } from '../input/inputMapping';

import * as controls from './controls';
import type { ControlsAxisSettings, ControlsFitOptions, ControlsParams } from './controls';

export type KlippControlsOptions<T = TargetPose | null, B = ConfinerBounds | null> = VirtualCameraOptions &
  Partial<ControlsParams> &
  ControlsAxisSettings & {
    /** What to orbit around. Without one, the camera orbits the world origin. */
    target?: T;
    /** A box or a sphere in world space the center of the orbit stays in. */
    panBounds?: B;
    /** Settings of the orbit around the target. Its radius follows `distance` and `zoom`. */
    orbit?: Omit<Partial<OrbitFollowParams>, 'radius'>;
  };

/** Transition events plus when the viewer starts and stops controlling the camera, and when it starts and stops moving. */
export type KlippControlsEventMap = CameraTransitionEventMap & {
  /** The viewer started controlling the camera: a button or a finger came down on it. */
  controlStart: object;
  /** The viewer let go. */
  controlEnd: object;
  /** The camera started moving, by input, damping or a move from code. */
  wake: object;
  /** The camera stopped moving. */
  rest: object;
};

type ControlsEvent = 'controlStart' | 'controlEnd' | 'wake' | 'rest';

const origin = targetPose.create();
const scratchCenter: Vec3 = [0, 0, 0];
const scratchPan: Vec3 = [0, 0, 0];
const scratchOffset: Vec3 = [0, 0, 0];
const scratchFrame: Quat = [0, 0, 0, 1];
const scratchInverse: Quat = [0, 0, 0, 1];
const scratchGoal: Vec3 = [0, 0, 0];
const scratchLook: Vec3 = [0, 0, 0];
const scratchDirection: Vec3 = [0, 0, 0];
const viewForward: Vec3 = [0, 0, -1];
const noPan: Vec3 = [0, 0, 0];
const noPoints: number[] = [];
const noOptions: ControlsFitOptions = {};

function refuse(slot: 'Body' | 'Aim', name: string): () => void {
  console.warn(`KlippControls "${name}" has its own ${slot}. Build a VirtualCamera to use a different one.`);
  return () => {};
}

/**
 * A camera the user orbits around a target, pans and zooms, driven by `horizontal`, `vertical`, `zoom`, `panX` and
 * `panY`. Its Body and Aim are built in; Extensions and Noises work as in any `VirtualCamera`. Layers override
 * `readTarget` and `readPanBounds`.
 */
export class KlippControls<T = TargetPose | null, B = ConfinerBounds | null>
  extends VirtualCamera<KlippControlsEventMap>
  implements ControlsParams
{
  /** What to orbit around. Without one, the camera orbits the world origin. */
  target: T;
  /** A box or a sphere in world space the center of the orbit stays in. `null` lets it go anywhere. */
  panBounds: B;
  declare distance: number;
  declare minDistance: number;
  declare maxDistance: number;
  declare panSlowingDistance: number;
  declare infinityDolly: boolean;

  /** The orbit around the target. Its `radius` follows `distance` and `zoom`. */
  readonly orbit = new OrbitFollowBody<TargetPose | null>(null);
  readonly horizontal = this.orbit.horizontal;
  readonly vertical = this.orbit.vertical;
  /** Natural log of how many times closer than `distance` the camera is. Its range follows the distance limits. */
  readonly zoom = new InputAxis();
  /** Drag across the view, in pixels. Panning moves the orbit's center so the point under the cursor follows it. */
  readonly panX = new InputAxis();
  readonly panY = new InputAxis();
  /** How far panning has moved the orbit's center from the target, in the frame of `orbit.bindingMode`. */
  readonly pan: Vec3 = [0, 0, 0];

  private readonly pivot = targetPose.create();
  private readonly zoomLimits: [number, number] = [-Infinity, Infinity];
  private readonly zoomPastLimits: [number, number] = [-Infinity, Infinity];
  private readonly primePosition: Vec3 = [0, 0, 0];
  private primed = false;
  private orthographic = false;
  private viewportHeight = 0;
  private readonly panApplied: [number, number] = [0, 0];
  private readonly panTransition = controls.createPanTransition();
  private aspect = 1;
  private readonly fitRequest = {
    pending: false,
    shape: 'sphere' as 'box' | 'sphere' | 'points',
    center: [0, 0, 0] as Vec3,
    halfExtents: [0, 0, 0] as Vec3,
    radius: 0,
    points: noPoints as ArrayLike<number>,
    count: 0,
    padding: 0,
    damping: 0 as DampingConstant,
  };
  private controlling = false;
  private moving = false;
  private readonly lastFrame = cameraState.create();
  private hasLastFrame = false;
  private readonly pendingEvents: ControlsEvent[] = [];
  private stopWaitingForFrameEnd: (() => void) | null = null;
  private readonly shown: Pick<CameraState, 'quaternion' | 'fov' | 'orthographicSize'> = {
    quaternion: [0, 0, 0, 1],
    fov: 0,
    orthographicSize: 0,
  };

  private readonly orbitPiece: BodyPiece = {
    update: (out, dt, justActivated) => this.updateOrbit(out, dt, justActivated),
    primeFrom: (position) => {
      this.orbit.primeFrom(position);
      vec3.copy(this.primePosition, position);
      this.primed = true;
    },
    inputAxes: {
      horizontal: this.horizontal,
      vertical: this.vertical,
      zoom: this.zoom,
      panX: this.panX,
      panY: this.panY,
    },
  };

  // Looks at the damped center the Body tracks, so orbiting turns the view around it.
  private readonly aimPiece: AimPiece = {
    update: (out) => {
      if (out.hasTarget) hardLookAt.update(out, out.target);
    },
  };

  private readonly zoomPiece: ExtensionPiece = {
    applyAfter: 'body',
    update: (out) => {
      if (this.orthographic) out.orthographicSize *= Math.exp(-this.zoom.value);
    },
  };

  constructor(name: string, options: KlippControlsOptions<T, B> = {}) {
    const { target, panBounds, orbit, horizontal, vertical, zoom, pan, ...rest } = options;
    const { distance, minDistance, maxDistance, panSlowingDistance, infinityDolly, ...cameraOptions } = rest;
    super(name, cameraOptions);
    this.target = (target ?? null) as T;
    this.panBounds = (panBounds ?? null) as B;
    Object.assign(
      this,
      controls.createParams({ distance, minDistance, maxDistance, panSlowingDistance, infinityDolly }),
    );
    Object.assign(this.orbit, orbitFollow.createParams(orbit));
    controls.applyAxisSettings(this, { horizontal, vertical, zoom, pan });
    this.zoom.range = controls.zoomRange(this.zoomLimits, this);
    for (const axis of [this.horizontal, this.vertical, this.zoom]) axis.setValue(axis.center);
    super.setBody(this.orbitPiece);
    this.orbit.camera = this;
    super.setAim(this.aimPiece);
    super.addExtension(this.zoomPiece);
  }

  override get body(): BodyPiece | null {
    return super.body;
  }

  /** The Body is built in: warns and keeps it. */
  override set body(_body: BodyPiece | null) {
    refuse('Body', this.name);
  }

  override get aim(): AimPiece | null {
    return super.aim;
  }

  /** The Aim is built in: warns and keeps it. */
  override set aim(_aim: AimPiece | null) {
    refuse('Aim', this.name);
  }

  /** The Body is built in: warns and keeps it. */
  override setBody(_body: BodyPiece | null): () => void {
    return refuse('Body', this.name);
  }

  /** The Aim is built in: warns and keeps it. */
  override setAim(_aim: AimPiece | null): () => void {
    return refuse('Aim', this.name);
  }

  /**
   * Drag with the left button or one finger to orbit, with the right button or two or three fingers to pan, drag the
   * middle button up and down, scroll or pinch to zoom. Each source in `overrides` replaces its default, and `null`
   * turns it off.
   */
  inputConfig(overrides?: InputControllerConfig): InputControllerConfig {
    return controls.inputConfig(this, overrides);
  }

  /** Camera forward from the axes alone. `flatten` keeps it level. */
  forward(out: Vec3, flatten = false): Vec3 {
    return this.orbit.forward(out, flatten);
  }

  /** Back to the center of each axis and onto the target. */
  reset({ damping = 0 }: EaseOptions = noOptions): void {
    const { horizontal, vertical, zoom } = this;
    inputAxis.easeTo(horizontal, horizontal.center, damping);
    inputAxis.easeTo(vertical, vertical.center, damping);
    inputAxis.easeTo(zoom, zoom.center, damping);
    controls.startPan(this.panTransition, this.pan, noPan, damping);
    this.holdAxes();
    this.klipp?.requestFrame();
  }

  /** Moves the center of the orbit to `point`, keeping the direction and the distance. */
  moveTo(point: Vec3, { damping = 0 }: EaseOptions = noOptions): void {
    const pose = this.readSource();
    if (!pose) return;
    tracker.referenceOrientation(scratchFrame, this.orbit.state.tracker, this.orbit.bindingMode, pose);
    controls.startPan(this.panTransition, this.pan, this.panToward(scratchGoal, pose, point), damping);
    this.holdAxes();
    this.klipp?.requestFrame();
  }

  /** Puts the camera at `position`, looking at `center`, or at the center of the orbit without one. */
  setLookAt(position: Vec3, center?: Vec3, { damping = 0 }: EaseOptions = noOptions): void {
    const pose = this.readSource();
    if (!pose) return;
    tracker.referenceOrientation(scratchFrame, this.orbit.state.tracker, this.orbit.bindingMode, pose);
    const look = center ? vec3.copy(scratchLook, center) : this.center(scratchLook, pose.position);
    this.panToward(scratchGoal, pose, look);
    const direction = vec3.subtract(scratchDirection, position, look);
    const distance = vec3.length(direction);
    const axes = orbitFollow.axesAlong(this.orbit.state, this.orbit, pose, direction);
    if (axes) {
      inputAxis.easeTo(this.horizontal, axes[0], damping);
      inputAxis.easeTo(this.vertical, axes[1], damping);
    }
    if (distance > 0) inputAxis.easeTo(this.zoom, this.zoomWithinLimits(controls.zoomAt(this, distance)), damping);
    controls.startPan(this.panTransition, this.pan, scratchGoal, damping);
    this.holdAxes();
    this.klipp?.requestFrame();
  }

  /**
   * Moves the center of the orbit to the middle of `bounds` and zooms until they just fill the view, with `padding`
   * around them, keeping the direction: a box by its corners as the camera sees them, a sphere by its outline. It frames
   * them by the view of the next frame.
   */
  fit(bounds: Box3 | Sphere, { padding = 0, damping = 0 }: ControlsFitOptions = noOptions): void {
    if (confiner.isEmpty(bounds)) return;
    const request = this.fitRequest;
    if (Array.isArray(bounds)) {
      box3.center(request.center, bounds);
      vec3.addScalar(request.halfExtents, box3.extents(request.halfExtents, bounds), padding);
      request.shape = 'box';
    } else {
      vec3.copy(request.center, bounds.center);
      request.radius = bounds.radius + padding;
      request.shape = 'sphere';
    }
    request.pending = true;
    request.damping = damping;
    this.holdAxes();
    this.klipp?.requestFrame();
  }

  /**
   * Like `fit`, for the first `count` of `points` in world space, flat `[x, y, z, ...]`: the center goes to the middle
   * of the box around them, and the camera as close as it gets with every point in view. It reads them on the next frame.
   */
  fitPoints(
    points: ArrayLike<number>,
    count: number,
    { padding = 0, damping = 0 }: ControlsFitOptions = noOptions,
  ): void {
    const request = this.fitRequest;
    request.count = Math.min(count, Math.floor(points.length / 3));
    if (request.count <= 0) return;
    request.points = points;
    request.padding = padding;
    request.shape = 'points';
    request.pending = true;
    request.damping = damping;
    this.holdAxes();
    this.klipp?.requestFrame();
  }

  /**
   * Stops the camera where it is: a move from a method, a fit not made yet, the damping of input and a recentering, which
   * waits again from here. Following the target with `orbit.damping` goes on.
   */
  stop(): void {
    for (const axis of [this.horizontal, this.vertical, this.zoom, this.panX, this.panY]) {
      inputAxis.setValue(axis, axis.value);
    }
    this.panTransition.active = false;
    this.fitRequest.pending = false;
    this.fitRequest.points = noPoints;
    this.holdAxes();
    this.klipp?.requestFrame();
  }

  /** Also moves the center of the orbit to the point the shot looked at, when it had one. */
  override [inherit](shot: CameraState): void {
    super[inherit](shot);
    if (shot.hasLookAtTarget) this.setLookAt(shot.position, shot.lookAtTarget);
  }

  override [run](dt: number): boolean {
    const stillInFlight = super[run](dt);
    const { horizontal, vertical, zoom, panX, panY } = this;
    const controlling = horizontal.held || vertical.held || zoom.held || panX.held || panY.held;
    if (controlling !== this.controlling) this.queueEvent(controlling ? 'controlStart' : 'controlEnd');
    this.controlling = controlling;

    // Moves without damping change the shot and leave nothing in flight.
    const changed =
      this.hasLastFrame &&
      (!cameraState.transformEquals(this.state, this.lastFrame) || !cameraState.lensEquals(this.state, this.lastFrame));
    const moving = stillInFlight || changed;
    if (moving !== this.moving) this.queueEvent(moving ? 'wake' : 'rest');
    this.moving = moving;
    cameraState.copy(this.lastFrame, this.state);
    this.hasLastFrame = true;
    return stillInFlight;
  }

  override [skip](dt: number): void {
    super[skip](dt);
    // In turn with other cameras it moves again on its next run; with 'never' it stays still until it is back.
    if (this.standbyUpdate === 'never' && this.moving) {
      this.moving = false;
      this.queueEvent('rest');
    }
  }

  protected override stopped(): void {
    this.dispatchPendingEvents();
    if (this.controlling) this.dispatchEvent({ type: 'controlEnd' });
    if (this.moving) this.dispatchEvent({ type: 'rest' });
    this.controlling = false;
    this.moving = false;
    this.hasLastFrame = false;
  }

  // Sent once the frame is over, so a listener can ask for another one.
  private queueEvent(type: ControlsEvent): void {
    this.pendingEvents.push(type);
    this.stopWaitingForFrameEnd ??= this.klipp?.[subscribeFrameEnd](this.dispatchPendingEvents) ?? null;
  }

  private readonly dispatchPendingEvents = (): void => {
    const events = this.pendingEvents;
    for (let i = 0; i < events.length; i++) this.dispatchEvent({ type: events[i] });
    events.length = 0;
    this.stopWaitingForFrameEnd?.();
    this.stopWaitingForFrameEnd = null;
  };

  override [prepare](width: number, height: number, orthographic: boolean): void {
    super[prepare](width, height, orthographic);
    this.orthographic = orthographic;
    this.viewportHeight = height;
    if (width > 0 && height > 0) this.aspect = width / height;
    // Panning drags the view on screen, with every Extension and Noise of the last frame.
    quat.copy(this.shown.quaternion, this.state.quaternion);
    this.shown.fov = this.state.fov;
    this.shown.orthographicSize = this.state.orthographicSize;
  }

  /** This frame's target pose, or `null` when it can't be read. Called only when there is a `target`. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }

  /** This frame's pan bounds, or `null` when there are none. */
  protected readPanBounds(): ConfinerBounds | null {
    return this.panBounds as ConfinerBounds | null;
  }

  private readSource(): TargetPose | null {
    return this.target == null ? origin : this.readTarget();
  }

  /** The pan that puts the center of the orbit at `center` for `pose`, with the frame `scratchFrame` holds. */
  private panToward(out: Vec3, pose: TargetPose, center: Vec3): Vec3 {
    vec3.subtract(out, center, pose.position);
    vec3.transformQuat(out, out, quat.conjugate(scratchInverse, scratchFrame));
    return vec3.subtract(out, out, this.orbit.targetOffset);
  }

  private startFit(pose: TargetPose): void {
    const request = this.fitRequest;
    const { shape, center, halfExtents, radius, points, count, padding, damping } = request;
    request.pending = false;
    // The points are read only here, so the request doesn't keep them alive.
    request.points = noPoints;
    if (shape === 'points') controls.pointsCenter(center, points, count);
    tracker.referenceOrientation(scratchFrame, this.orbit.state.tracker, this.orbit.bindingMode, pose);
    const { shown, aspect } = this;
    const view = shown.quaternion;
    let zoom: number | null = null;
    if (this.orthographic) {
      // The size before zoom, so the view ends up just holding the shape once zoom scales it.
      const size = shown.orthographicSize * Math.exp(this.zoom.value);
      const fitted =
        shape === 'box'
          ? controls.fitBoxSize(halfExtents, view, aspect)
          : shape === 'sphere'
            ? controls.fitSphereSize(radius, aspect)
            : controls.fitPointsSize(points, count, center, view, aspect, padding);
      if (fitted > 0) zoom = Math.log(size / fitted);
    } else {
      const distance =
        shape === 'box'
          ? controls.fitBoxDistance(halfExtents, view, shown.fov, aspect)
          : shape === 'sphere'
            ? controls.fitSphereDistance(radius, shown.fov, aspect)
            : controls.fitPointsDistance(points, count, center, view, shown.fov, aspect, padding);
      if (distance > 0) zoom = this.zoomWithinLimits(controls.zoomAt(this, distance));
    }
    if (zoom !== null) inputAxis.easeTo(this.zoom, zoom, damping);
    controls.startPan(this.panTransition, this.pan, this.panToward(scratchGoal, pose, center), damping);
  }

  private inputTouches(): boolean {
    const { horizontal, vertical, zoom, panX, panY } = this;
    return (
      horizontal.held ||
      horizontal.hadDelta ||
      vertical.held ||
      vertical.hadDelta ||
      zoom.held ||
      zoom.hadDelta ||
      panX.held ||
      panX.hadDelta ||
      panY.held ||
      panY.hadDelta
    );
  }

  /** Whether a move from a method is under way. */
  private movingByMethod(): boolean {
    return this.horizontal.easing || this.vertical.easing || this.zoom.easing || this.panTransition.active;
  }

  /** Holds recentering on every axis for its next update, so its wait starts over. */
  private holdAxes(): void {
    this.horizontal.holding = true;
    this.vertical.holding = true;
    this.zoom.holding = true;
    this.panX.holding = true;
    this.panY.holding = true;
  }

  private updateOrbit(out: CameraState, dt: number, justActivated: boolean): boolean {
    const source = this.readSource();
    if (source) {
      vec3.copy(this.pivot.position, source.position);
      quat.copy(this.pivot.rotation, source.rotation);
      this.pivot.hasRotation = source.hasRotation;
    }
    const pivot = source ? this.pivot : null;
    const limits = controls.zoomRange(this.zoomLimits, this);
    const dollyPastLimits = this.infinityDolly && !this.orthographic && this.minDistance <= this.maxDistance;
    this.zoom.range = dollyPastLimits ? this.zoomPastLimits : limits;
    // A range that shrank under a damped zoom would leave it chasing a goal it can't reach.
    const range = this.zoom.range;
    this.zoom.rawValue = clamp(this.zoom.rawValue, range[0], range[1]);
    if (this.fitRequest.pending && pivot) this.startFit(pivot);
    const touched = this.inputTouches();
    if (touched) {
      this.panTransition.active = false;
      inputAxis.stopEasing(this.horizontal);
      inputAxis.stopEasing(this.vertical);
      inputAxis.stopEasing(this.zoom);
    }
    if (justActivated || touched || this.movingByMethod()) this.holdAxes();
    const moving = controls.stepPan(this.panTransition, this.pan, dt);
    const zooming = this.zoom.update(dt);
    const dollyForward = dollyPastLimits ? controls.takeDollyPastLimits(this.zoom, this) : 0;
    const panning = this.updatePan(pivot, dt, dollyForward);
    if (this.primed && pivot) {
      this.primed = false;
      const distance = vec3.distance(
        this.primePosition,
        orbitFollow.center(scratchCenter, this.orbit.state, this.orbit, pivot),
      );
      if (distance > 0) this.zoom.setValue(this.zoomWithinLimits(controls.zoomAt(this, distance)));
    }
    this.orbit.radius = this.orthographic ? this.distance : controls.distanceAt(this, this.zoom.value);
    this.orbit.target = pivot;
    const orbiting = this.orbit.update(out, dt, justActivated);
    return orbiting || zooming || panning || moving;
  }

  // The pan axes keep the drag not applied yet; what they ease through this frame moves the orbit's center.
  private updatePan(pivot: TargetPose | null, dt: number, dollyForward: number): boolean {
    const movingX = this.panX.update(dt);
    const movingY = this.panY.update(dt);
    const dx = this.panX.value - this.panApplied[0];
    const dy = this.panY.value - this.panApplied[1];
    this.panApplied[0] = movingX ? this.panX.value : 0;
    this.panApplied[1] = movingY ? this.panY.value : 0;
    // A settled axis starts over from zero, so its value doesn't grow without bound.
    if (!movingX) this.panX.setValue(0);
    if (!movingY) this.panY.setValue(0);
    if (!pivot) return movingX || movingY;

    tracker.referenceOrientation(scratchFrame, this.orbit.state.tracker, this.orbit.bindingMode, pivot);
    quat.conjugate(scratchInverse, scratchFrame);
    const bounds = this.readPanBounds();
    if ((dx !== 0 || dy !== 0) && this.viewportHeight > 0) {
      const distance = controls.distanceAt(this, this.zoom.value);
      const height = controls.viewHeight(this.shown, distance, this.orthographic);
      controls.panDelta(scratchPan, this.shown.quaternion, dx, dy, height / this.viewportHeight);
      this.shiftCenter(scratchPan, pivot, bounds);
    }
    if (dollyForward !== 0) {
      vec3.transformQuat(scratchPan, viewForward, this.shown.quaternion);
      this.shiftCenter(vec3.scale(scratchPan, scratchPan, dollyForward), pivot, bounds);
    }
    if (bounds) {
      confiner.confinePoint(scratchCenter, bounds, this.center(scratchCenter, pivot.position));
      vec3.transformQuat(scratchOffset, this.orbit.targetOffset, scratchFrame);
      vec3.subtract(pivot.position, scratchCenter, scratchOffset);
    } else {
      vec3.add(pivot.position, pivot.position, vec3.transformQuat(scratchPan, this.pan, scratchFrame));
    }
    return movingX || movingY;
  }

  /** Moves the orbit's center by `delta` in world space, slowing down and stopping at the pan bounds. Uses `delta`. */
  private shiftCenter(delta: Vec3, pivot: TargetPose, bounds: ConfinerBounds | null): void {
    if (!bounds) {
      vec3.add(this.pan, this.pan, vec3.transformQuat(delta, delta, scratchInverse));
      return;
    }
    // The pan never piles up past the edge, so dragging back moves the view right away.
    confiner.confinePoint(scratchCenter, bounds, this.center(scratchCenter, pivot.position));
    vec3.add(delta, scratchCenter, delta);
    confiner.confineStep(scratchCenter, bounds, scratchCenter, delta, this.panSlowingDistance);
    vec3.transformQuat(this.pan, vec3.subtract(scratchCenter, scratchCenter, pivot.position), scratchInverse);
    vec3.subtract(this.pan, this.pan, this.orbit.targetOffset);
  }

  /** `zoom` within the distance limits, for moves from code, which keep the orbit's center where they put it. */
  private zoomWithinLimits(zoom: number): number {
    const [farthest, closest] = controls.zoomRange(this.zoomLimits, this);
    return clamp(zoom, farthest, closest);
  }

  /** The center of the orbit around `targetPosition`, with the pan and `orbit.targetOffset` turned by `scratchFrame`. */
  private center(out: Vec3, targetPosition: Vec3): Vec3 {
    vec3.transformQuat(out, vec3.add(out, this.pan, this.orbit.targetOffset), scratchFrame);
    return vec3.add(out, out, targetPosition);
  }
}
