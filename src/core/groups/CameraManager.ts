import * as cameraState from '../cameraState';
import { CameraMixer } from '../CameraMixer';
import type { CameraState } from '../cameraState';
import { advance, attachTo, owner, root, rootChanged, runCameras, setActive, startFresh } from '../internal';
import type { Klipp } from '../Klipp';
import type { KlippParams } from '../klippState';
import { VirtualCameraBase, type VirtualCameraOptions } from '../VirtualCameraBase';

export type CameraManagerOptions = VirtualCameraOptions & Partial<KlippParams>;

class ChildCameras extends CameraMixer {
  private readonly group: VirtualCameraBase;
  private readonly contributes: (camera: VirtualCameraBase) => boolean;

  constructor(
    group: VirtualCameraBase,
    settings: Partial<KlippParams>,
    contributes: (camera: VirtualCameraBase) => boolean,
  ) {
    super('manual', settings);
    this.group = group;
    this.contributes = contributes;
  }

  override [root](): Klipp | null {
    return this.group.klipp;
  }

  override [owner](): VirtualCameraBase {
    return this.group;
  }

  protected override runsEveryFrame(camera: VirtualCameraBase): boolean {
    return this.contributes(camera);
  }
}

/** A camera made of other cameras: picks one of its `children` every frame and blends between them. */
export abstract class CameraManager extends VirtualCameraBase {
  /** The child cameras, with their own arbitration, blends and events. */
  readonly children: CameraMixer;

  constructor(name: string, { defaultBlend, customBlends, ...options }: CameraManagerOptions = {}) {
    super(name, options);
    this.children = new ChildCameras(this, { defaultBlend, customBlends }, (camera) => this.contributes(camera));
  }

  /** Name of the child to head to this frame. */
  protected abstract chooseCamera(dt: number): string | null;

  /** Whether `camera` adds to this frame's shot, so it runs every frame whatever its `standbyUpdate`. */
  protected contributes(camera: VirtualCameraBase): boolean {
    return camera.name === this.children.activeCameraName;
  }

  /** Writes this frame's shot from `blended`, the blend between the children. */
  protected writeShot(out: CameraState, blended: CameraState): void {
    if (this.children.state.blend.hasEverActivated) cameraState.copy(out, blended);
  }

  override [attachTo](mixer: CameraMixer | null): void {
    super[attachTo](mixer);
    this.children[rootChanged]();
  }

  override update = (out: CameraState, dt: number, justActivated: boolean): boolean => {
    if (justActivated) this.children[startFresh]();
    this.children[setActive](this.chooseCamera(dt));
    const stillInFlight = this.children[runCameras](dt);
    this.writeShot(out, this.children[advance](dt));
    return stillInFlight || this.children.isBlending;
  };
}
