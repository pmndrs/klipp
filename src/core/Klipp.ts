import * as cameraState from './cameraState';
import { CameraMixer } from './CameraMixer';
import type { CameraState } from './cameraState';
import { advance, root, runCameras } from './internal';
import type { KlippParams } from './klippState';
import { VirtualCamera } from './VirtualCamera';
import type { VirtualCameraOptions } from './VirtualCameraBase';

/** `'enabled'` writes the output, `'standby'` keeps every camera updating without writing, `'disabled'` stops. */
export type KlippMode = 'enabled' | 'standby' | 'disabled';

/** Per-frame work that runs before the cameras, like input. Return `true` while it is still moving. */
export type FrameUpdate = (dt: number) => boolean | void;

export type KlippOptions = Partial<KlippParams> & {
  mode?: KlippMode;
  /** The pose and lens new virtual cameras start from. */
  initialCameraState?: CameraState;
};

/** Runs virtual cameras, picks the winner by priority and blends between shots. */
export class Klipp extends CameraMixer {
  /** The pose and lens new virtual cameras start from. */
  readonly initialCameraState: CameraState;

  private readonly updates = new Set<FrameUpdate>();
  private readonly previousResult = cameraState.create();
  private settled = false;
  private _width = 0;
  private _height = 0;
  private _mode: KlippMode = 'enabled';

  constructor(options: KlippOptions = {}) {
    super('priority', { defaultBlend: options.defaultBlend, customBlends: options.customBlends });
    this.mode = options.mode ?? 'enabled';
    this.initialCameraState = options.initialCameraState ?? cameraState.create();
  }

  get mode(): KlippMode {
    return this._mode;
  }

  /** Switching back to `'enabled'` writes the next shot even if it did not change, to take the camera back. */
  set mode(mode: KlippMode) {
    if (mode === 'enabled' && this._mode !== 'enabled') this.settled = false;
    this._mode = mode;
  }

  /** The last shot `update` wrote. Read it after `update` to put it on your camera. */
  get shot(): CameraState {
    return this.previousResult;
  }

  override [root](): Klipp {
    return this;
  }

  /** Viewport width in pixels, `0` until `setSize`. */
  get width(): number {
    return this._width;
  }

  /** Viewport height in pixels, `0` until `setSize`. */
  get height(): number {
    return this._height;
  }

  /** Set the viewport size in pixels. Pieces that frame by screen size get it whenever they update. */
  setSize(width: number, height: number): void {
    this._width = width;
    this._height = height;
  }

  /** Create a virtual camera and add it. */
  addCamera(name: string, options?: VirtualCameraOptions): VirtualCamera {
    const camera = new VirtualCamera(name, options);
    this.add(camera);
    return camera;
  }

  /** Run `update` every frame before the cameras. Returns a function that stops it. */
  registerUpdate(update: FrameUpdate): () => void {
    this.updates.add(update);
    return () => this.updates.delete(update);
  }

  /**
   * Advance one frame: run every camera, pick and blend the shot, and `write` it when it changed.
   * Returns `true` while something is still moving, so on-demand rendering knows to request another frame.
   */
  update(dt: number): boolean {
    if (this.mode === 'disabled') return false;

    this.prepareFrame();
    // Keep `=== true` semantics: some writers return a real boolean value even when typed as void.
    let stillInFlight = false;
    for (const update of this.updates) {
      if (update(dt) === true) stillInFlight = true;
    }
    if (this[runCameras](dt)) stillInFlight = true;
    const result = this[advance](dt);

    // Standby stays warm but never writes.
    if (this.mode === 'standby') return stillInFlight || this.isBlending;
    // Do not write the untouched initial state before any camera has gone live.
    if (!this.state.blend.hasEverActivated) return stillInFlight;

    const previous = this.previousResult;
    const transformChanged = !this.settled || !cameraState.transformEquals(result, previous);
    const lensChanged = !this.settled || !cameraState.lensEquals(result, previous);
    if (!transformChanged && !lensChanged) return stillInFlight;

    cameraState.copy(previous, result);
    this.settled = true;
    this.write(result, transformChanged, lensChanged);
    return true;
  }

  /** Runs at the start of every frame, before any camera. Layers override it to read their targets. */
  protected prepareFrame(): void {}

  /** Called with the output whenever it changed. Layers override it to write their camera. */
  protected write(_result: CameraState, _transformChanged: boolean, _lensChanged: boolean): void {}
}
