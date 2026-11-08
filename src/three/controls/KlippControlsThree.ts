import { vec3 } from 'math';
import type { Box3 as Box3Math, Sphere as SphereMath } from 'math/shapes';
import { Vector3, type Box3, type BufferAttribute, type Mesh, type Object3D, type Sphere } from 'three';

import * as orbitFollow from '../../core/body/orbitFollow';
import * as targetPose from '../../core/targetPose';
import type { CameraMixer } from '../../core/CameraMixer';
import type { ControlsFitOptions, ControlsMoveOptions } from '../../core/controls/controls';
import { KlippControls, type KlippControlsOptions } from '../../core/controls/KlippControls';
import type { ConfinerBounds } from '../../core/extension/confiner';
import { attachTo, prepare } from '../../core/internal';
import type { TargetPose } from '../../core/targetPose';
import type { CameraPiece } from '../../core/VirtualCamera';

import { readTargetPose } from '../readTargetPose';
import { resolveInitialState, type InitialCameraState } from '../VirtualCameraThree';

import {
  createConfinerBoundsScratch,
  resolveConfinerBounds,
  type ConfinerBoundsThree,
} from '../resolve/resolveConfinerBounds';
import { optionalVec3, resolveVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';
import { TargetSlots } from '../resolve/TargetSlots';

type OrbitOptions = NonNullable<KlippControlsOptions['orbit']>;

const scratchVertex = new Vector3();
const scratchStack: Object3D[] = [];

/** Writes every vertex of `object` and its children, in world space, into `scratch.positions`. Returns how many. */
function collectVertices(scratch: { positions: Float32Array }, object: Object3D): number {
  object.updateWorldMatrix(true, true);
  let count = 0;
  scratchStack.push(object);
  for (let child = scratchStack.pop(); child; child = scratchStack.pop()) {
    for (let i = 0; i < child.children.length; i++) scratchStack.push(child.children[i]);
    const mesh = child as Mesh;
    const position = mesh.geometry?.getAttribute('position') as BufferAttribute | undefined;
    if (!position) continue;
    const needed = (count + position.count) * 3;
    if (scratch.positions.length < needed) {
      const grown = new Float32Array(Math.max(needed, scratch.positions.length * 2));
      grown.set(scratch.positions);
      scratch.positions = grown;
    }
    for (let i = 0; i < position.count; i++, count++) {
      if (mesh.isMesh) mesh.getVertexPosition(i, scratchVertex);
      else scratchVertex.fromBufferAttribute(position, i);
      scratchVertex.applyMatrix4(child.matrixWorld).toArray(scratch.positions, count * 3);
    }
  }
  return count;
}

export type KlippControlsThreeOptions = Omit<
  KlippControlsOptions<Target, ConfinerBoundsThree>,
  'initialState' | 'orbit'
> & {
  /** Starting pose, applied on creation. Defaults to the real camera's pose. */
  initialState?: InitialCameraState;
  /** Settings of the orbit around the target. Its radius follows `distance` and `zoom`. */
  orbit?: Omit<OrbitOptions, 'targetOffset'> & { targetOffset?: Vector3Like };
};

/**
 * `KlippControls` orbiting an `Object3D`, ref or fixed point, and taking a three.js `Box3` or `Sphere` as pan bounds.
 * Without a target, it orbits the world origin.
 */
export class KlippControlsThree extends KlippControls<Target, ConfinerBoundsThree> {
  targetSlot: TargetSlot | null = null;
  private readonly targetSlots = new TargetSlots();
  private readonly pose = targetPose.create();
  private readonly boundsScratch = createConfinerBoundsScratch();
  private readonly scratchPosition = vec3.create();
  private readonly scratchCenter = vec3.create();
  private readonly fitScratch = createConfinerBoundsScratch();
  private readonly fitVertices = { positions: new Float32Array(0) };

  constructor(name: string, { initialState, orbit, ...options }: KlippControlsThreeOptions = {}) {
    super(name, {
      ...options,
      initialState: initialState && resolveInitialState(initialState),
      orbit: orbit && { ...orbit, targetOffset: optionalVec3(orbit.targetOffset) },
    });
  }

  override moveTo(point: Vector3Like, options?: ControlsMoveOptions): void {
    super.moveTo(resolveVec3(this.scratchPosition, point), options);
  }

  override setLookAt(position: Vector3Like, center?: Vector3Like, options?: ControlsMoveOptions): void {
    const look = center === undefined ? undefined : resolveVec3(this.scratchCenter, center);
    super.setLookAt(resolveVec3(this.scratchPosition, position), look, options);
  }

  /** Also takes a three.js `Box3` or `Sphere`, or an `Object3D`, framed by every vertex of it and its children. */
  override fit(bounds: Box3Math | SphereMath | Box3 | Sphere | Object3D, options?: ControlsFitOptions): void {
    if ('isObject3D' in bounds) {
      const count = collectVertices(this.fitVertices, bounds);
      this.fitPoints(this.fitVertices.positions, count, options);
      return;
    }
    const resolved = resolveConfinerBounds(this.fitScratch, bounds);
    if (resolved) super.fit(resolved, options);
  }

  override [attachTo](mixer: CameraMixer | null): void {
    this.targetSlots.releaseAll();
    super[attachTo](mixer);
    this.targetSlots.attach(this.klipp);
  }

  override [prepare](width: number, height: number, orthographic: boolean): void {
    super[prepare](width, height, orthographic);
    this.targetSlots.sync(this.pieces);
    this.targetSlots.syncReader(this);
  }

  protected override removePiece(piece: CameraPiece): void {
    super.removePiece(piece);
    this.targetSlots.release(piece);
  }

  protected override readTarget(): TargetPose | null {
    const withRotation = orbitFollow.needsTargetRotation(this.orbit.state, this.orbit);
    return readTargetPose(this.pose, this.target, withRotation, this.targetSlot) ? this.pose : null;
  }

  protected override readPanBounds(): ConfinerBounds | null {
    return resolveConfinerBounds(this.boundsScratch, this.panBounds);
  }
}
