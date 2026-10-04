import { withDefaults } from '../params.js';
import { impulseField, type ImpulseField } from './ImpulseField.js';

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
