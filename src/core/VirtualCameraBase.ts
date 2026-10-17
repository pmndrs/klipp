import * as cameraState from './cameraState';
import type { CameraMixer } from './CameraMixer';
import type { CameraState } from './cameraState';
import { EventDispatcher } from './EventDispatcher';
import { attachTo, checkName, parent, prepare, register, root, run, setHints, setPriority, skip } from './internal';
import type { Klipp } from './Klipp';
import type { CameraTransitionEventMap } from './klippState';

import { BlendHints } from './blend/BlendHints';

/** How a camera updates while another one is on screen: every frame, one camera per frame in turn, or not at all. */
export type StandbyUpdate = 'always' | 'roundRobin' | 'never';

export type VirtualCameraOptions = {
  /** The active camera with the highest priority is on screen. */
  priority?: number;
  /** Whether this camera takes part in arbitration and updates. */
  active?: boolean;
  /** Blend hints for transitions involving this camera. */
  hints?: BlendHints;
  /** Starting pose and lens, applied over the `Klipp`'s `initialCameraState` when first added. */
  initialState?: Partial<CameraState>;
  /** How this camera updates while another one is on screen. */
  standbyUpdate?: StandbyUpdate;
};

/** A shot `Klipp` or a group can pick: its name, priority, state and place in the arbitration. `update` writes the state. */
export class VirtualCameraBase extends EventDispatcher<CameraTransitionEventMap> {
  /** This camera's own state, written by `update` every frame. */
  readonly state: CameraState;
  /** How this camera updates while another one is on screen. */
  standbyUpdate: StandbyUpdate;

  protected readonly initialState: Partial<CameraState> | undefined;
  protected hasRun = false;

  private _name: string;
  private _priority: number;
  private _hints: BlendHints;
  private _active: boolean;
  private _parent: CameraMixer | null = null;
  private seeded = false;
  private stopTracking: (() => void) | null = null;
  private unregister: (() => void) | null = null;
  private justActivated = true;
  private skippedTime = 0;

  constructor(name: string, options: VirtualCameraOptions = {}) {
    super();
    this._name = name;
    this._priority = options.priority ?? 0;
    this._hints = options.hints ?? BlendHints.none;
    this._active = options.active ?? true;
    this.standbyUpdate = options.standbyUpdate ?? 'roundRobin';
    this.initialState = options.initialState;
    // Also applied now, so pieces set before the camera is added can prime from it.
    this.state = cameraState.merge(cameraState.create(), options.initialState ?? {});
  }

  /** The `Klipp` at the top, whether this camera is in it directly or in a group. */
  get klipp(): Klipp | null {
    return this._parent?.[root]() ?? null;
  }

  get [parent](): CameraMixer | null {
    return this._parent;
  }

  get name(): string {
    return this._name;
  }

  /** Renaming a registered camera registers it again under the new name. */
  set name(name: string) {
    if (name === this._name) return;
    this._name = name;
    this._parent?.[checkName](this);
    if (this.unregister) {
      this.unregister();
      this.unregister = this._parent![register](this.registration());
    }
  }

  get priority(): number {
    return this._priority;
  }

  set priority(priority: number) {
    this._priority = priority;
    if (this.unregister) this._parent![setPriority](this._name, priority);
  }

  get hints(): BlendHints {
    return this._hints;
  }

  set hints(hints: BlendHints) {
    this._hints = hints;
    if (this.unregister) this._parent![setHints](this._name, hints);
  }

  /** Whether this camera takes part. Turning it back on starts it fresh, like a first activation. */
  get active(): boolean {
    return this._active;
  }

  set active(active: boolean) {
    this._active = active;
    this.syncRegistration();
  }

  /** Join `mixer`'s arbitration, or leave it with `null`. Only the mixers' `add` and `remove` call this. */
  [attachTo](mixer: CameraMixer | null): void {
    this.stopTracking?.();
    this.stopTracking = null;
    this._parent = mixer;
    if (mixer) {
      this.seed();
      this.stopTracking = this.trackEvents(mixer);
    }
    this.syncRegistration();
  }

  /** Called by the mixer before the frame, once the viewport size is known. */
  [prepare](_width: number, _height: number): void {}

  /** Run `update` for one frame, if registered. Returns `true` while it is still moving. Called by the mixer. */
  [run](dt: number): boolean {
    if (!this.unregister) return false;
    const stillInFlight = this.update(this.state, dt + this.skippedTime, this.justActivated);
    this.skippedTime = 0;
    this.justActivated = false;
    this.hasRun = true;
    return stillInFlight;
  }

  /** Skip this frame, adding its time to the next run. Called by the mixer for cameras in standby. */
  [skip](dt: number): void {
    if (this.unregister) this.skippedTime += dt;
  }

  /** Writes `out` for one frame. Returns `true` while it is still moving. */
  update = (_out: CameraState, _dt: number, _justActivated: boolean): boolean => false;

  // The root's initialCameraState is known only once there is a Klipp at the top.
  private seed(): void {
    const klipp = this.klipp;
    if (this.seeded || !klipp) return;
    cameraState.copy(this.state, klipp.initialCameraState);
    if (this.initialState) cameraState.merge(this.state, this.initialState);
    this.seeded = true;
  }

  private registration() {
    return { id: this._name, priority: this._priority, state: this.state, hints: this._hints };
  }

  private syncRegistration(): void {
    const shouldRegister = this._parent !== null && this._active;
    if (shouldRegister && !this.unregister) {
      this.unregister = this._parent![register](this.registration());
      this.justActivated = true;
      this.skippedTime = 0;
    } else if (!shouldRegister && this.unregister) {
      this.unregister();
      this.unregister = null;
    }
  }

  /** Re-dispatch events for this camera only when it participates in the transition. */
  private trackEvents(mixer: CameraMixer): () => void {
    const onActivated = (event: CameraTransitionEventMap['activated']) => {
      if (event.incoming === this.name) this.dispatchEvent({ type: 'activated', ...event });
    };
    const onDeactivated = (event: CameraTransitionEventMap['deactivated']) => {
      if (event.outgoing === this.name) this.dispatchEvent({ type: 'deactivated', ...event });
    };
    const onBlendCreated = (event: CameraTransitionEventMap['blendCreated']) => {
      if (event.incoming === this.name || event.outgoing === this.name) {
        this.dispatchEvent({ type: 'blendCreated', ...event });
      }
    };
    const onBlendFinished = (event: CameraTransitionEventMap['blendFinished']) => {
      if (event.incoming === this.name) this.dispatchEvent({ type: 'blendFinished', ...event });
    };
    const onCut = (event: CameraTransitionEventMap['cut']) => {
      if (event.incoming === this.name || event.outgoing === this.name) {
        this.dispatchEvent({ type: 'cut', ...event });
      }
    };
    mixer.addEventListener('activated', onActivated);
    mixer.addEventListener('deactivated', onDeactivated);
    mixer.addEventListener('blendCreated', onBlendCreated);
    mixer.addEventListener('blendFinished', onBlendFinished);
    mixer.addEventListener('cut', onCut);
    return () => {
      mixer.removeEventListener('activated', onActivated);
      mixer.removeEventListener('deactivated', onDeactivated);
      mixer.removeEventListener('blendCreated', onBlendCreated);
      mixer.removeEventListener('blendFinished', onBlendFinished);
      mixer.removeEventListener('cut', onCut);
    };
  }
}
