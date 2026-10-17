import { vec3, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import { withDefaults } from '../params';

import { impulseField, type ImpulseField } from './ImpulseField';
import type { ImpulseClockSeconds } from './impulses';

export type ImpulseListenerParams = {
  /** Impulse field to sample. */
  field: ImpulseField;
  /** Only reacts to events where `(event.channel & channelMask) !== 0`. */
  channelMask: number;
  /** Multiplies the sampled offset. `0` mutes this listener entirely. */
  gain: number;
  /** Whether to apply the impulse direction in camera space. */
  cameraSpace: boolean;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<ImpulseListenerParams>): ImpulseListenerParams =>
  withDefaults({ field: impulseField, channelMask: 1, gain: 1, cameraSpace: false }, settings);

const scratchOffset: Vec3 = [0, 0, 0];

/** Pushes `out` by the impulses felt at its position. Returns their strength. */
export function update(out: CameraState, params: ImpulseListenerParams, now?: ImpulseClockSeconds): number {
  const strength = params.field.sample(scratchOffset, out.position, params.channelMask, params.gain, now);
  if (params.cameraSpace) vec3.transformQuat(scratchOffset, scratchOffset, out.quaternion);
  vec3.add(out.position, out.position, scratchOffset);
  return strength;
}
