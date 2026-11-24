import { clamp, vec2, vec3, type Vec2, type Vec3 } from 'math';

import * as cameraState from './cameraState';
import { CameraMixer } from './CameraMixer';
import type { CameraState } from './cameraState';
import { advance, currentInsets, root, runCameras, subscribeFrameEnd } from './internal';
import type { KlippParams } from './klippState';

import * as damping from './damping/damping';
import type { DamperState, DampingConstant } from './damping/damping';

const scratchUp: Vec3 = [0, 0, 0];
const scratchFree: Vec2 = [0, 0];
const scratchCenter: Vec2 = [0, 0];

/** `'enabled'` writes the output, `'standby'` keeps every camera updating without writing, `'disabled'` stops. */
export type KlippMode = 'enabled' | 'standby' | 'disabled';

/** Per-frame work that runs before the cameras, like input. Return `true` while it is still moving. */
export type FrameUpdate = (dt: number) => boolean | void;

/** CSS pixels of the viewport covered by UI on each side. */
export type Insets = { top: number; right: number; bottom: number; left: number };

const sides = ['top', 'right', 'bottom', 'left'] as const;

export type KlippOptions = Partial<KlippParams> & {
  mode?: KlippMode;
  /** The pose and lens new virtual cameras start from. */
  initialCameraState?: CameraState;
  /** Up of the scene. See `up`. */
  up?: Vec3;
  /** UI covering the viewport. See `setInsets`. */
  insets?: Partial<Insets>;
  /** Response time for the shot to follow a change of the insets. */
  insetsDamping?: DampingConstant;
};

/** Runs virtual cameras, picks the winner by priority and blends between shots. */
export class Klipp extends CameraMixer {
  /** The pose and lens new virtual cameras start from. */
  readonly initialCameraState: CameraState;
  /** Response time for the shot to follow a change of the insets. */
  insetsDamping: DampingConstant;

  private readonly updates = new Set<FrameUpdate>();
  private readonly frameRequestListeners = new Set<() => void>();
  private readonly frameEndListeners = new Set<() => void>();
  private readonly output = cameraState.create();
  private readonly previousResult = cameraState.create();
  private settled = false;
  private updating = false;
  private _width = 0;
  private _height = 0;
  private _orthographic = false;
  private _mode: KlippMode = 'enabled';
  private readonly _up: Vec3 = [0, 1, 0];
  private readonly _insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  private readonly _currentInsets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  private readonly insetDampers: Record<keyof Insets, DamperState> = {
    top: damping.createState(),
    right: damping.createState(),
    bottom: damping.createState(),
    left: damping.createState(),
  };

  constructor(options: KlippOptions = {}) {
    super('priority', { defaultBlend: options.defaultBlend, customBlends: options.customBlends });
    this.mode = options.mode ?? 'enabled';
    this.initialCameraState = options.initialCameraState ?? cameraState.create();
    this.insetsDamping = options.insetsDamping ?? 0;
    if (options.up) this.up = options.up;
    if (options.insets) this.setInsets(options.insets);
  }

  get mode(): KlippMode {
    return this._mode;
  }

  /** Switching back to `'enabled'` writes the next shot even if it did not change, to take the camera back. */
  set mode(mode: KlippMode) {
    if (mode === this._mode) return;
    this._mode = mode;
    if (mode === 'enabled') this.requestWrite();
    else this.requestFrame();
  }

  /** The last shot `update` wrote. Read it after `update` to put it on your camera. */
  get shot(): CameraState {
    return this.previousResult;
  }

  override [root](): Klipp {
    return this;
  }

  /** Viewport width in CSS pixels, `0` until `setSize`. */
  get width(): number {
    return this._width;
  }

  /** Viewport height in CSS pixels, `0` until `setSize`. */
  get height(): number {
    return this._height;
  }

  /** Set the viewport size in CSS pixels. Pieces that frame by screen size get it whenever they update. */
  setSize(width: number, height: number): void {
    if (width !== this._width || height !== this._height) this.requestWrite();
    this._width = width;
    this._height = height;
  }

  /** Whether the camera being driven is orthographic. Pieces that frame on screen get it whenever they update. */
  get orthographic(): boolean {
    return this._orthographic;
  }

  set orthographic(orthographic: boolean) {
    if (orthographic !== this._orthographic) this.requestWrite();
    this._orthographic = orthographic;
  }

  /**
   * Up of the scene, `[0, 1, 0]` by default: the `referenceUp` every camera starts each frame from, unless its
   * `initialState` sets one, and the axis blend hints arc around.
   */
  get up(): Vec3 {
    return this._up;
  }

  set up(up: Vec3) {
    const length = vec3.length(up);
    if (length > 0 && !vec3.exactEquals(this._up, vec3.scale(scratchUp, up, 1 / length))) {
      vec3.copy(this._up, scratchUp);
      this.requestFrame();
    }
  }

  /** CSS pixels of the viewport covered by UI on each side, `0` until `setInsets`. */
  get insets(): Readonly<Insets> {
    return this._insets;
  }

  /**
   * Set how many CSS pixels of the viewport UI covers on each side, `0` for a side left out. The shot is centered in
   * the rest of the viewport.
   */
  setInsets(insets: Partial<Insets>): void {
    let changed = false;
    for (const side of sides) {
      const inset = insets[side] ?? 0;
      if (inset !== this._insets[side]) changed = true;
      this._insets[side] = inset;
    }
    if (changed) this.requestFrame();
  }

  get [currentInsets](): Readonly<Insets> {
    return this._currentInsets;
  }

  /** Run `update` every frame before the cameras. Returns a function that stops it. */
  registerUpdate(update: FrameUpdate): () => void {
    this.updates.add(update);
    return () => this.updates.delete(update);
  }

  /**
   * Asks for one more frame, for a loop that runs only on demand: calls every `subscribeFrameRequest` listener. During
   * `update` it does nothing, since that frame takes the change and reports any further motion itself.
   */
  requestFrame(): void {
    if (this.updating) return;
    for (const listener of this.frameRequestListeners) listener();
  }

  /** Calls `listener` whenever something changes between frames. Returns a function that stops it. */
  subscribeFrameRequest = (listener: () => void): (() => void) => {
    this.frameRequestListeners.add(listener);
    return () => this.frameRequestListeners.delete(listener);
  };

  /**
   * Advance one frame: run every camera, pick and blend the shot, and `write` it when it changed.
   * Returns `true` while something is still moving, so on-demand rendering knows to request another frame.
   */
  update(dt: number): boolean {
    if (this.mode === 'disabled') return false;
    this.updating = true;
    let stillInFlight: boolean;
    try {
      stillInFlight = this.runFrame(dt);
    } finally {
      this.updating = false;
    }
    for (const listener of this.frameEndListeners) listener();
    return stillInFlight;
  }

  [subscribeFrameEnd](listener: () => void): () => void {
    this.frameEndListeners.add(listener);
    return () => this.frameEndListeners.delete(listener);
  }

  private runFrame(dt: number): boolean {
    this.prepareFrame();
    // Keep `=== true` semantics: some writers return a real boolean value even when typed as void.
    let stillInFlight = false;
    for (const update of this.updates) {
      if (update(dt) === true) stillInFlight = true;
    }
    if (this.dampInsets(dt)) stillInFlight = true;
    if (this[runCameras](dt)) stillInFlight = true;
    const result = this[advance](dt);
    // A blend still has to move even on a frame that left the shot unchanged, like one with no elapsed time.
    if (this.isBlending) stillInFlight = true;

    // Standby stays warm but never writes.
    if (this.mode === 'standby') return stillInFlight;
    // Do not write the untouched initial state before any camera has gone live.
    if (!this.state.blend.hasEverActivated) return stillInFlight;

    const output = this.applyInsets(this.output, result);
    const previous = this.previousResult;
    const transformChanged = !this.settled || !cameraState.transformEquals(output, previous);
    const lensChanged = !this.settled || !cameraState.lensEquals(output, previous);
    if (!transformChanged && !lensChanged) return stillInFlight;

    cameraState.copy(previous, output);
    this.settled = true;
    this.write(previous, transformChanged, lensChanged);
    return true;
  }

  /** Moves the damped insets toward `insets`. Returns `true` while they are still moving. */
  private dampInsets(dt: number): boolean {
    const snap = typeof this.insetsDamping === 'number' && this.insetsDamping <= 0;
    let moving = false;
    for (const side of sides) {
      const damper = this.insetDampers[side];
      const inset = this._insets[side];
      if (snap) {
        damping.start(damper);
        damper.value = inset;
      } else {
        damping.damp(damper, inset, this.insetsDamping, dt);
      }
      this._currentInsets[side] = damper.value;
      if (damper.value !== inset) moving = true;
    }
    return moving;
  }

  /** `result` with its view offset moved into the part of the viewport the insets leave free. */
  private applyInsets(out: CameraState, result: CameraState): CameraState {
    cameraState.copy(out, result);
    const width = this._width;
    const height = this._height;
    if (!(width > 0 && height > 0)) return out;
    const { top, right, bottom, left } = this._currentInsets;
    vec2.set(scratchFree, clamp(1 - (left + right) / width, 0, 1), clamp(1 - (top + bottom) / height, 0, 1));
    vec2.set(scratchCenter, (left - right) / width, (bottom - top) / height);
    vec2.multiply(out.viewOffset, out.viewOffset, scratchFree);
    vec2.add(out.viewOffset, out.viewOffset, scratchCenter);
    return out;
  }

  /** Runs at the start of every frame, before any camera. Layers override it to read their targets. */
  protected prepareFrame(): void {}

  /** Called with the output whenever it changed. Layers override it to write their camera. */
  protected write(_result: CameraState, _transformChanged: boolean, _lensChanged: boolean): void {}

  /** Writes the next shot even if it did not change, for example to a new camera. */
  protected requestWrite(): void {
    this.settled = false;
    this.requestFrame();
  }
}
