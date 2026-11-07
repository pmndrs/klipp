import { quat, vec3, type Quat, type Vec3 } from 'math';

import * as targetPose from '../targetPose';
import type { CameraState } from '../cameraState';
import { prepare } from '../internal';
import type { TargetPose } from '../targetPose';
import { VirtualCamera, type AimPiece, type BodyPiece, type ExtensionPiece } from '../VirtualCamera';
import type { VirtualCameraOptions } from '../VirtualCameraBase';

import * as hardLookAt from '../aim/hardLookAt';
import * as orbitFollow from '../body/orbitFollow';
import * as tracker from '../body/tracker';
import type { OrbitFollowParams } from '../body/orbitFollow';
import { OrbitFollowBody } from '../body/OrbitFollowBody';
import { InputAxis } from '../input/InputAxis';
import type { InputControllerConfig } from '../input/inputMapping';

import * as controls from './controls';
import type { ControlsAxisSettings, ControlsParams } from './controls';

export type KlippControlsOptions<T = TargetPose | null> = VirtualCameraOptions &
  Partial<ControlsParams> &
  ControlsAxisSettings & {
    /** What to orbit around. Without one, the camera orbits the world origin. */
    target?: T;
    /** Settings of the orbit around the target. Its radius follows `distance` and `zoom`. */
    orbit?: Omit<Partial<OrbitFollowParams>, 'radius'>;
  };

const origin = targetPose.create();
const scratchCenter: Vec3 = [0, 0, 0];
const scratchPan: Vec3 = [0, 0, 0];
const scratchFrame: Quat = [0, 0, 0, 1];
const scratchInverse: Quat = [0, 0, 0, 1];

function refuse(slot: 'Body' | 'Aim', name: string): () => void {
  console.warn(`KlippControls "${name}" has its own ${slot}. Build a VirtualCamera to use a different one.`);
  return () => {};
}

/**
 * A camera the user orbits around a target, pans and zooms, driven by `horizontal`, `vertical`, `zoom`, `panX` and
 * `panY`. Its Body and Aim are built in; Extensions and Noises work as in any `VirtualCamera`. Layers override
 * `readTarget`.
 */
export class KlippControls<T = TargetPose | null> extends VirtualCamera implements ControlsParams {
  /** What to orbit around. Without one, the camera orbits the world origin. */
  target: T;
  declare distance: number;
  declare minDistance: number;
  declare maxDistance: number;

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
  private readonly primePosition: Vec3 = [0, 0, 0];
  private primed = false;
  private orthographic = false;
  private viewportHeight = 0;
  private readonly panApplied: [number, number] = [0, 0];
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

  constructor(name: string, options: KlippControlsOptions<T> = {}) {
    const { target, distance, minDistance, maxDistance, orbit, horizontal, vertical, zoom, pan, ...cameraOptions } =
      options;
    super(name, cameraOptions);
    this.target = (target ?? null) as T;
    Object.assign(this, controls.createParams({ distance, minDistance, maxDistance }));
    Object.assign(this.orbit, orbitFollow.createParams(orbit));
    controls.applyAxisSettings(this, { horizontal, vertical, zoom, pan });
    this.zoom.range = controls.zoomRange(this.zoomLimits, this);
    for (const axis of [this.horizontal, this.vertical, this.zoom]) axis.setValue(axis.center);
    super.setBody(this.orbitPiece);
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
   * Drag with the left button or one finger to orbit, with the right button or two or three fingers to pan, scroll
   * or pinch to zoom.
   */
  inputConfig(): InputControllerConfig {
    return controls.inputConfig(this);
  }

  override [prepare](width: number, height: number, orthographic: boolean): void {
    super[prepare](width, height, orthographic);
    this.orthographic = orthographic;
    this.viewportHeight = height;
    // Panning drags the view on screen, with every Extension and Noise of the last frame.
    quat.copy(this.shown.quaternion, this.state.quaternion);
    this.shown.fov = this.state.fov;
    this.shown.orthographicSize = this.state.orthographicSize;
  }

  /** This frame's target pose, or `null` when it can't be read. Called only when there is a `target`. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }

  private updateOrbit(out: CameraState, dt: number, justActivated: boolean): boolean {
    const source = this.target == null ? origin : this.readTarget();
    if (source) {
      vec3.copy(this.pivot.position, source.position);
      quat.copy(this.pivot.rotation, source.rotation);
      this.pivot.hasRotation = source.hasRotation;
    }
    const pivot = source ? this.pivot : null;
    this.zoom.range = controls.zoomRange(this.zoomLimits, this);
    if (justActivated) this.zoom.idleTime = 0;
    if (this.primed && pivot) {
      this.primed = false;
      const distance = vec3.distance(
        this.primePosition,
        orbitFollow.center(scratchCenter, this.orbit.state, this.orbit, pivot),
      );
      if (distance > 0) this.zoom.setValue(controls.zoomAt(this, distance));
    }
    const zooming = this.zoom.update(dt);
    const panning = this.updatePan(pivot, dt);
    this.orbit.radius = this.orthographic ? this.distance : controls.distanceAt(this, this.zoom.value);
    this.orbit.target = pivot;
    const orbiting = this.orbit.update(out, dt, justActivated);
    return orbiting || zooming || panning;
  }

  // The pan axes keep the drag not applied yet; what they ease through this frame moves the orbit's center.
  private updatePan(pivot: TargetPose | null, dt: number): boolean {
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
    if ((dx !== 0 || dy !== 0) && this.viewportHeight > 0) {
      const distance = controls.distanceAt(this, this.zoom.value);
      const height = controls.viewHeight(this.shown, distance, this.orthographic);
      controls.panDelta(scratchPan, this.shown.quaternion, dx, dy, height / this.viewportHeight);
      vec3.transformQuat(scratchPan, scratchPan, quat.conjugate(scratchInverse, scratchFrame));
      vec3.add(this.pan, this.pan, scratchPan);
    }
    vec3.add(pivot.position, pivot.position, vec3.transformQuat(scratchPan, this.pan, scratchFrame));
    return movingX || movingY;
  }
}
