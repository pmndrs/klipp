import type { CameraState } from '../CameraState';
import type { DampingConstant } from '../damping/damping';
import type {
  GroupFramingFitMode,
  GroupFramingMode,
  GroupFramingParams,
  GroupMember,
  GroupPositionMode,
} from './groupFraming';
import * as groupFraming from './groupFraming';

export type GroupFramingOptions = Partial<GroupFramingParams>;

/** Keeps a group of members in frame by adjusting distance and view offset. Layers override `readMembers`. */
export class GroupFramingExtension implements GroupFramingParams {
  /** The members, updated by the caller every frame. */
  members: readonly GroupMember[];
  positionMode: GroupPositionMode;
  declare padding: number;
  declare viewportWidth: number;
  declare viewportHeight: number;
  declare damping: DampingConstant;
  declare maxSpeed: number;
  declare screenPosition: [number, number];
  declare fitMode: GroupFramingFitMode;
  declare minDistance: number;
  declare maxDistance: number;
  declare framingMode: GroupFramingMode;

  readonly state = groupFraming.createState();

  constructor(
    members: readonly GroupMember[] = [],
    positionMode: GroupPositionMode = 'groupCenter',
    options?: GroupFramingOptions,
  ) {
    this.members = members;
    this.positionMode = positionMode;
    Object.assign(this, groupFraming.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): boolean => {
    const members = this.readMembers();
    return groupFraming.update(out, this.state, this, members, this.positionMode, dt, justActivated);
  };

  /** This frame's members. */
  protected readMembers(): readonly GroupMember[] {
    return this.members;
  }
}
