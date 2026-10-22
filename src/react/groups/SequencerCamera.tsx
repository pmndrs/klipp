import { useImperativeHandle, useState, type Ref } from 'react';

import * as sequencer from '../../core/groups/sequencer';
import type { SequencerParams } from '../../core/groups/sequencer';
import { SequencerCamera as SequencerCameraCore } from '../../core/groups/SequencerCamera';

import { CameraGroup, type CameraGroupProps } from './CameraGroup';

export type SequencerCameraProps = CameraGroupProps &
  Partial<SequencerParams> & {
    ref?: Ref<SequencerCameraCore>;
  };

/** Shows the `<VirtualCamera>`s inside one after another, and starts over whenever it becomes the active camera. */
export function SequencerCamera({ instructions, loop, paused, defaultBlend, ref, ...group }: SequencerCameraProps) {
  const params = sequencer.createParams({ instructions, loop, paused, defaultBlend });
  const [camera] = useState(() => new SequencerCameraCore(group.name, params));
  Object.assign(camera, params);
  useImperativeHandle(ref, () => camera, [camera]);

  return <CameraGroup group={camera} {...group} />;
}
