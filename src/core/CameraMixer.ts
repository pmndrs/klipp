import * as klippState from './klippState';
import type { CameraState } from './cameraState';
import { EventDispatcher } from './EventDispatcher';
import {
  advance,
  attachTo,
  checkName,
  owner,
  parent,
  prepare,
  register,
  root,
  rootChanged,
  run,
  runCameras,
  setActive,
  setHints,
  setPriority,
  skip,
  startFresh,
} from './internal';
import type { Klipp } from './Klipp';
import type {
  CameraSelection,
  CameraTransitionEventMap,
  KlippParams,
  KlippState,
  VirtualCameraConfig,
} from './klippState';
import type { VirtualCameraBase } from './VirtualCameraBase';

import type { BlendDefinition, CustomBlend } from './blend/BlendDefinition';
import type { BlendHints } from './blend/BlendHints';

/** Holds virtual cameras, picks the active one and blends between them: `Klipp`, and the children of a group. */
export class CameraMixer extends EventDispatcher<CameraTransitionEventMap> implements KlippParams {
  declare defaultBlend: BlendDefinition;
  declare customBlends: CustomBlend[];

  readonly state: KlippState;

  protected readonly cameras = new Set<VirtualCameraBase>();
  private readonly activeCameraListeners = new Set<() => void>();
  private readonly liveCameraListeners = new Set<() => void>();
  private draining = false;
  private roundRobinTurn = 0;

  constructor(selection: CameraSelection, settings?: Partial<KlippParams>) {
    super();
    this.state = klippState.create(selection);
    Object.assign(this, klippState.createParams(settings));
  }

  /** Name of the winning camera, the one the shot heads to. */
  get activeCameraName(): string | null {
    return this.state.activeName;
  }

  isActive(name: string): boolean {
    return this.state.activeName === name;
  }

  /** Subscribe to active camera changes. */
  subscribeActiveCamera = (listener: () => void): (() => void) => {
    this.activeCameraListeners.add(listener);
    return () => this.activeCameraListeners.delete(listener);
  };

  /** The active camera's own state, before blending. */
  get activeCameraState(): CameraState | null {
    return this.state.activeName !== null ? this.state.cameras.get(this.state.activeName)!.state : null;
  }

  /** Name of the camera fully on screen, once the blend into it has finished. */
  get liveCameraName(): string | null {
    return this.state.blend.liveName;
  }

  isLive(name: string): boolean {
    return this.state.blend.liveName === name;
  }

  /** Subscribe to live camera changes. */
  subscribeLiveCamera = (listener: () => void): (() => void) => {
    this.liveCameraListeners.add(listener);
    return () => this.liveCameraListeners.delete(listener);
  };

  get isBlending(): boolean {
    return this.state.blend.transition.active;
  }

  [root](): Klipp | null {
    return null;
  }

  [owner](): VirtualCameraBase | null {
    return null;
  }

  /** Register a camera and return an unregister callback. */
  [register](config: VirtualCameraConfig): () => void {
    const camera = klippState.register(this.state, config);
    this.drainEvents();
    return () => {
      klippState.unregister(this.state, camera);
      this.drainEvents();
    };
  }

  /** Update a candidate priority without restarting the current blend. */
  [setPriority](name: string, priority: number): void {
    klippState.setPriority(this.state, name, priority);
    this.drainEvents();
  }

  /** Update candidate hints in place. */
  [setHints](name: string, hints: BlendHints): void {
    klippState.setHints(this.state, name, hints);
  }

  [setActive](name: string | null): void {
    klippState.setActive(this.state, name);
    this.drainEvents();
  }

  /** Add a virtual camera, moving it from wherever it was. Returns a function that removes it. */
  add(camera: VirtualCameraBase): () => void {
    if (camera[parent] !== this) {
      camera[parent]?.remove(camera);
      this[checkName](camera);
      this.cameras.add(camera);
      camera[attachTo](this);
    }
    return () => this.remove(camera);
  }

  /** Remove a virtual camera. It leaves the arbitration, and the shot blends to the next winner. */
  remove(camera: VirtualCameraBase): void {
    if (!this.cameras.delete(camera)) return;
    camera[attachTo](null);
  }

  [checkName](camera: VirtualCameraBase): void {
    for (const other of this.cameras) {
      if (other !== camera && other.name === camera.name) {
        console.warn(
          `Two virtual cameras are named "${camera.name}". Names must be unique: blends and events use them.`,
        );
        return;
      }
    }
  }

  [rootChanged](): void {
    for (const camera of this.cameras) camera[attachTo](this);
  }

  [startFresh](): void {
    for (const camera of this.cameras) camera[startFresh]();
  }

  /**
   * Call `start` while `camera` is on screen, and the function it returns once it leaves, for example to connect
   * input. A camera in a group is on screen only while the group is too. With `waitForBlend`, on screen begins once
   * the blend into it has finished. Returns a function that stops.
   */
  whileOnScreen(camera: VirtualCameraBase, start: () => () => void, { waitForBlend = true } = {}): () => void {
    const levels = this.levelsDownTo(camera);
    let stop: (() => void) | null = null;
    const check = () => {
      let onScreen = true;
      for (const level of levels) {
        const { name } = level.camera;
        if (!level.mixer.isActive(name) || (waitForBlend && !level.mixer.isLive(name))) onScreen = false;
      }
      if (onScreen && !stop) stop = start();
      else if (!onScreen && stop) {
        stop();
        stop = null;
      }
    };
    const unsubscribes = levels.flatMap(({ mixer }) => [
      mixer.subscribeActiveCamera(check),
      mixer.subscribeLiveCamera(check),
    ]);
    check();
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
      stop?.();
      stop = null;
    };
  }

  /** `camera` and each group above it up to this mixer, with the mixer each one is in. */
  private levelsDownTo(camera: VirtualCameraBase): { mixer: CameraMixer; camera: VirtualCameraBase }[] {
    const levels: { mixer: CameraMixer; camera: VirtualCameraBase }[] = [];
    let level: VirtualCameraBase | null = camera;
    while (level?.[parent]) {
      const mixer: CameraMixer = level[parent];
      levels.push({ mixer, camera: level });
      if (mixer === this) return levels;
      level = mixer[owner]();
    }
    // Not under this mixer yet: watched as one of its own cameras.
    return [{ mixer: this, camera }];
  }

  /** Returns `true` while one of the cameras moves. */
  [runCameras](dt: number): boolean {
    const klipp = this[root]();
    const width = klipp?.width ?? 0;
    const height = klipp?.height ?? 0;
    const orthographic = klipp?.orthographic ?? false;

    let roundRobinCount = 0;
    for (const camera of this.cameras) {
      if (camera.active && !this.runsEveryFrame(camera) && camera.standbyUpdate === 'roundRobin') roundRobinCount++;
    }
    const turn = roundRobinCount > 0 ? this.roundRobinTurn++ % roundRobinCount : -1;

    let stillInFlight = false;
    let roundRobinIndex = 0;
    for (const camera of this.cameras) {
      if (!camera.active) continue;
      const skips =
        !this.runsEveryFrame(camera) &&
        (camera.standbyUpdate === 'never' || (camera.standbyUpdate === 'roundRobin' && roundRobinIndex++ !== turn));
      if (skips) {
        camera[skip](dt);
        continue;
      }
      camera[prepare](width, height, orthographic);
      if (camera[run](dt)) stillInFlight = true;
    }
    return stillInFlight;
  }

  /** Whether `camera` runs every frame, whatever its `standbyUpdate`: the camera the shot heads to. */
  protected runsEveryFrame(camera: VirtualCameraBase): boolean {
    return camera.name === this.state.activeName;
  }

  /** Advance the blend and return the reusable output state. */
  [advance](dt: number): CameraState {
    const result = klippState.tick(this.state, this, dt);
    this.drainEvents();
    return result;
  }

  /** Notify subscribers and listeners of buffered events, including ones raised while notifying. */
  private drainEvents(): void {
    if (this.draining) return;
    this.draining = true;
    const events = this.state.events;
    let i = 0;
    try {
      for (; i < events.length; i++) {
        const event = events[i];
        if (event.type === 'activeCameraChanged') for (const listener of this.activeCameraListeners) listener();
        else if (event.type === 'liveCameraChanged') for (const listener of this.liveCameraListeners) listener();
        else this.dispatchEvent(event);
      }
    } finally {
      // A throwing listener drops only the events delivered so far, the rest wait for the next drain.
      if (i >= events.length) events.length = 0;
      else events.splice(0, i + 1);
      this.draining = false;
    }
  }
}
