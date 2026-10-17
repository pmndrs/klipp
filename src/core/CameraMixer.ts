import * as klippState from './klippState';
import type { CameraState } from './cameraState';
import { EventDispatcher } from './EventDispatcher';
import {
  advance,
  attachTo,
  checkName,
  parent,
  prepare,
  register,
  root,
  rootChanged,
  run,
  runCameras,
  setHints,
  setPriority,
  skip,
} from './internal';
import type { Klipp } from './Klipp';
import type {
  CameraSelection,
  CameraTransitionEventMap,
  KlippParams,
  KlippState,
  VirtualCameraConfig,
} from './klippState';
import { VirtualCamera } from './VirtualCamera';
import type { VirtualCameraBase, VirtualCameraOptions } from './VirtualCameraBase';

import type { BlendDefinition, CustomBlend } from './blend/BlendDefinition';
import type { BlendHints } from './blend/BlendHints';

/** Holds virtual cameras, picks the active one and blends between them: `Klipp`, and the children of a group. */
export class CameraMixer extends EventDispatcher<CameraTransitionEventMap> implements KlippParams {
  declare defaultBlend: BlendDefinition;
  declare customBlends: CustomBlend[];

  readonly state: KlippState;

  protected readonly cameras = new Set<VirtualCameraBase>();
  private readonly activeIdListeners = new Set<() => void>();
  private readonly liveIdListeners = new Set<() => void>();
  private draining = false;
  private roundRobinTurn = 0;

  constructor(selection: CameraSelection, settings?: Partial<KlippParams>) {
    super();
    this.state = klippState.create(selection);
    Object.assign(this, klippState.createParams(settings));
  }

  /** Name of the winning camera, the one the shot heads to. */
  get activeCameraName(): string | null {
    return this.state.activeId;
  }

  isActive(name: string): boolean {
    return this.state.activeId === name;
  }

  /** Subscribe to active camera changes. */
  subscribeActiveCamera = (listener: () => void): (() => void) => {
    this.activeIdListeners.add(listener);
    return () => this.activeIdListeners.delete(listener);
  };

  /** The active camera's own state, before blending. */
  get activeCameraState(): CameraState | null {
    return this.state.activeId !== null ? this.state.cameras.get(this.state.activeId)!.state : null;
  }

  /** Name of the camera fully on screen, once the blend into it has finished. */
  get liveCameraName(): string | null {
    return this.state.blend.liveId;
  }

  isLive(name: string): boolean {
    return this.state.blend.liveId === name;
  }

  /** Subscribe to live camera changes. */
  subscribeLiveCamera = (listener: () => void): (() => void) => {
    this.liveIdListeners.add(listener);
    return () => this.liveIdListeners.delete(listener);
  };

  get isBlending(): boolean {
    return this.state.blend.transition.active;
  }

  [root](): Klipp | null {
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
  [setPriority](id: string, priority: number): void {
    klippState.setPriority(this.state, id, priority);
    this.drainEvents();
  }

  /** Update candidate hints in place. */
  [setHints](id: string, hints: BlendHints): void {
    klippState.setHints(this.state, id, hints);
  }

  /** Create a virtual camera and add it. */
  addCamera(name: string, options?: VirtualCameraOptions): VirtualCamera {
    const camera = new VirtualCamera(name, options);
    this.add(camera);
    return camera;
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

  /**
   * Call `start` while `camera` is on screen, and the function it returns once it leaves, for example to connect
   * input. With `waitForBlend`, on screen begins once the blend into it has finished. Returns a function that stops.
   */
  whileOnScreen(camera: VirtualCameraBase, start: () => () => void, { waitForBlend = true } = {}): () => void {
    let stop: (() => void) | null = null;
    const check = () => {
      const onScreen = this.isActive(camera.name) && (!waitForBlend || this.isLive(camera.name));
      if (onScreen && !stop) stop = start();
      else if (!onScreen && stop) {
        stop();
        stop = null;
      }
    };
    const offActive = this.subscribeActiveCamera(check);
    const offLive = this.subscribeLiveCamera(check);
    check();
    return () => {
      offActive();
      offLive();
      stop?.();
      stop = null;
    };
  }

  /** Returns `true` while one of the cameras moves. */
  [runCameras](dt: number): boolean {
    const activeId = this.state.activeId;
    const klipp = this[root]();
    const width = klipp?.width ?? 0;
    const height = klipp?.height ?? 0;

    let roundRobinCount = 0;
    for (const camera of this.cameras) {
      if (camera.active && camera.name !== activeId && camera.standbyUpdate === 'roundRobin') roundRobinCount++;
    }
    const turn = roundRobinCount > 0 ? this.roundRobinTurn++ % roundRobinCount : -1;

    let stillInFlight = false;
    let roundRobinIndex = 0;
    for (const camera of this.cameras) {
      if (!camera.active) continue;
      const skips =
        camera.name !== activeId &&
        (camera.standbyUpdate === 'never' || (camera.standbyUpdate === 'roundRobin' && roundRobinIndex++ !== turn));
      if (skips) {
        camera[skip](dt);
        continue;
      }
      camera[prepare](width, height);
      if (camera[run](dt)) stillInFlight = true;
    }
    return stillInFlight;
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
        if (event.type === 'activeIdChanged') for (const listener of this.activeIdListeners) listener();
        else if (event.type === 'liveIdChanged') for (const listener of this.liveIdListeners) listener();
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
