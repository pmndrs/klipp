import { quat, type Quat, type Vec3 } from 'math';

import * as cameraState from './cameraState';
import type { CameraState } from './cameraState';
import { prepare } from './internal';
import { VirtualCameraBase } from './VirtualCameraBase';

import type { InputAxisData } from './input/axis';
import type { InputAxisOwner } from './input/InputAxisOwner';

/** Writes `out` for one frame. Return `true` when more work remains for a later frame. */
export type CameraStateWriter = (out: CameraState, dt: number, justActivated: boolean) => boolean | void;

/** A Body, Aim, Extension or Noise: anything with an `update` that writes the camera state. */
export type CameraPiece = {
  update: CameraStateWriter;
  /** Viewport width divided by height, kept up to date by the camera when the piece has it. */
  aspect?: number;
  /** Whether the camera being driven is orthographic, kept up to date by the camera when the piece has it. */
  orthographic?: boolean;
  /** Axes an input controller can drive, by name. */
  inputAxes?: Record<string, InputAxisData>;
};

/** A Body. `primeFrom` starts it from the camera's `initialState.position`. */
export type BodyPiece = CameraPiece & { primeFrom?: (position: Vec3) => void };

/** An Aim. `primeFrom` starts it from the camera's `initialState.quaternion`. */
export type AimPiece = CameraPiece & { primeFrom?: (rotation: Quat, referenceUp: Vec3) => void };

/**
 * An Extension. `applyAfter` picks its slot: `'start'` before the Body, for the lens both frame with, `'body'` before
 * the Aim, for what depends on the Body's position, `'aim'` after both. `primeFrom` starts it from `initialState`.
 */
export type ExtensionPiece = CameraPiece & {
  primeFrom?: (initialState: Partial<CameraState>) => void;
  applyAfter?: ExtensionSlot;
};

export type ExtensionSlot = 'start' | 'body' | 'aim';

/** Warn when a second Body or Aim replaces an existing one. */
function warnDoubleRegistration(slot: 'Body' | 'Aim', name: string): void {
  console.warn(`Virtual camera "${name}": a second ${slot} replaced the first. A camera runs one ${slot}.`);
}

const noop = (): void => {};

function copyLens(out: CameraState, source: CameraState): void {
  out.fov = source.fov;
  out.orthographicSize = source.orthographicSize;
  out.near = source.near;
  out.far = source.far;
  out.viewOffset[0] = source.viewOffset[0];
  out.viewOffset[1] = source.viewOffset[1];
}

/** A shot built from pieces: one Body, one Aim, then Extensions and Noises in the order added. */
export class VirtualCamera extends VirtualCameraBase implements InputAxisOwner {
  /** Every piece, in no particular order. */
  protected readonly pieces = new Set<CameraPiece>();

  private _body: BodyPiece | null = null;
  private _aim: AimPiece | null = null;
  private removeBody: () => void = noop;
  private removeAim: () => void = noop;
  private readonly extensions = new Set<ExtensionPiece>();
  private readonly noises = new Set<CameraPiece>();
  private _inputAxes: Record<string, InputAxisData> | null = null;
  private readonly raw = cameraState.create();
  private readonly rawLens = cameraState.create();

  /** Every input axis of this camera's pieces, by name. A new object whenever the pieces change. */
  get inputAxes(): Record<string, InputAxisData> {
    return (this._inputAxes ??= this.collectInputAxes());
  }

  get body(): BodyPiece | null {
    return this._body;
  }

  /** Replace the Body. */
  set body(body: BodyPiece | null) {
    this.removeBody();
    this.setBody(body);
  }

  get aim(): AimPiece | null {
    return this._aim;
  }

  /** Replace the Aim. */
  set aim(aim: AimPiece | null) {
    this.removeAim();
    this.setAim(aim);
  }

  /** Add the Body. A second one replaces it with a warning. Returns a function that removes it, unless replaced. */
  setBody(body: BodyPiece | null): () => void {
    if (this._body) {
      if (body) warnDoubleRegistration('Body', this.name);
      this.removePiece(this._body);
    }
    this._body = body;
    if (!body) return (this.removeBody = noop);
    this.addPiece(body);
    // initialState only shapes the first activation.
    if (!this.hasRun && this.initialState?.position) body.primeFrom?.(this.state.position);
    return (this.removeBody = () => {
      if (this._body !== body) return;
      this.removePiece(body);
      this._body = null;
      this.removeBody = noop;
    });
  }

  /** Add the Aim. Like `setBody`, a second one replaces it with a warning. */
  setAim(aim: AimPiece | null): () => void {
    if (this._aim) {
      if (aim) warnDoubleRegistration('Aim', this.name);
      this.removePiece(this._aim);
    }
    this._aim = aim;
    if (!aim) return (this.removeAim = noop);
    this.addPiece(aim);
    if (!this.hasRun && this.initialState?.quaternion) aim.primeFrom?.(this.state.quaternion, this.state.referenceUp);
    return (this.removeAim = () => {
      if (this._aim !== aim) return;
      this.removePiece(aim);
      this._aim = null;
      this.removeAim = noop;
    });
  }

  /** Add an Extension. They run in the order added. Returns a function that removes it. */
  addExtension(extension: ExtensionPiece): () => void {
    this.addPiece(extension);
    this.extensions.add(extension);
    if (!this.hasRun && this.initialState) extension.primeFrom?.(this.initialState);
    return () => this.removePiece(extension);
  }

  /** Add a Noise. They run in the order added, after every Extension. Returns a function that removes it. */
  addNoise(noise: CameraPiece): () => void {
    this.addPiece(noise);
    this.noises.add(noise);
    return () => this.removePiece(noise);
  }

  /** Pass the projection, and the viewport size once known, on to pieces that frame by them. */
  override [prepare](width: number, height: number, orthographic: boolean): void {
    super[prepare](width, height, orthographic);
    const hasSize = width > 0 && height > 0;
    for (const piece of this.pieces) {
      if ('orthographic' in piece) piece.orthographic = orthographic;
      if (hasSize && 'aspect' in piece) piece.aspect = width / height;
    }
  }

  /** Called when a piece is removed, for layers that hold per-piece resources. */
  protected removePiece(piece: CameraPiece): void {
    this.pieces.delete(piece);
    this.extensions.delete(piece);
    this.noises.delete(piece);
    this._inputAxes = null;
  }

  private addPiece(piece: CameraPiece): void {
    this.pieces.add(piece);
    this._inputAxes = null;
  }

  private runExtensions(slot: ExtensionSlot, out: CameraState, dt: number, justActivated: boolean): boolean {
    let stillInFlight = false;
    for (const extension of this.extensions) {
      if ((extension.applyAfter ?? 'aim') !== slot) continue;
      if (extension.update(out, dt, justActivated) === true) stillInFlight = true;
    }
    return stillInFlight;
  }

  private collectInputAxes(): Record<string, InputAxisData> {
    const axes: Record<string, InputAxisData> = {};
    for (const piece of this.pieces) {
      if (!piece.inputAxes) continue;
      for (const name in piece.inputAxes) {
        if (name in axes) {
          console.warn(
            `Virtual camera "${this.name}": two pieces have an input axis named "${name}". Using the first.`,
          );
        } else {
          axes[name] = piece.inputAxes[name];
        }
      }
    }
    return axes;
  }

  /**
   * Run every piece against `out` once, in order. Extensions and Noises correct the state the Body and Aim wrote,
   * and the next frame's Body and Aim start from that state without the corrections.
   */
  override update = (out: CameraState, dt: number, justActivated: boolean): boolean => {
    // Keep `=== true` semantics: some pieces return a real boolean even when typed as void.
    let stillInFlight = false;
    if (this.hasRun) cameraState.copy(out, this.raw);
    copyLens(this.rawLens, out);
    quat.identity(out.rotationDampingBypass);
    if (this.runExtensions('start', out, dt, justActivated)) stillInFlight = true;
    if (this._body?.update(out, dt, justActivated) === true) stillInFlight = true;
    if (this.runExtensions('body', out, dt, justActivated)) stillInFlight = true;
    if (this._aim?.update(out, dt, justActivated) === true) stillInFlight = true;
    cameraState.copy(this.raw, out);
    copyLens(this.raw, this.rawLens);
    if (this.runExtensions('aim', out, dt, justActivated)) stillInFlight = true;
    for (const noise of this.noises) {
      if (noise.update(out, dt, justActivated) === true) stillInFlight = true;
    }
    return stillInFlight;
  };
}
