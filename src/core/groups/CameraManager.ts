import * as cameraState from '../cameraState';
import * as klippState from '../klippState';
import { CameraMixer } from '../CameraMixer';
import type { CameraState } from '../cameraState';
import { advance, attachTo, root, rootChanged, runCameras } from '../internal';
import type { Klipp } from '../Klipp';
import type { KlippParams } from '../klippState';
import { VirtualCameraBase, type VirtualCameraOptions } from '../VirtualCameraBase';

export type CameraManagerOptions = VirtualCameraOptions & Partial<KlippParams>;

class ChildCameras extends CameraMixer {
  private readonly owner: VirtualCameraBase;
  private readonly contributes: (camera: VirtualCameraBase) => boolean;

  constructor(
    owner: VirtualCameraBase,
    settings: Partial<KlippParams>,
    contributes: (camera: VirtualCameraBase) => boolean,
  ) {
    super('manual', settings);
    this.owner = owner;
    this.contributes = contributes;
  }

  override [root](): Klipp | null {
    return this.owner.klipp;
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

  override [attachTo](mixer: CameraMixer | null): void {
    super[attachTo](mixer);
    this.children[rootChanged]();
  }

  override update = (out: CameraState, dt: number): boolean => {
    klippState.setActive(this.children.state, this.chooseCamera(dt));
    const stillInFlight = this.children[runCameras](dt);
    const result = this.children[advance](dt);
    if (this.children.state.blend.hasEverActivated) cameraState.copy(out, result);
    return stillInFlight || this.children.isBlending;
  };
}
