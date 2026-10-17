import { useImperativeHandle, useMemo, useState, type ReactNode, type Ref } from 'react';

import * as sequencer from '../../core/groups/sequencer';
import { BlendHints } from '../../core/blend/BlendHints';
import type { SequencerParams } from '../../core/groups/sequencer';
import { SequencerCamera as SequencerCameraCore } from '../../core/groups/SequencerCamera';
import type { StandbyUpdate } from '../../core/VirtualCameraBase';

import { CameraMixerContext, type CameraMixerScope } from '../CameraMixerContext';
import { useCameraRegistration } from '../useCameraRegistration';
import { useInvalidateOnRender } from '../useInvalidateOnRender';

export type SequencerCameraProps = Partial<SequencerParams> & {
  name: string;
  /** The active camera with the highest priority is on screen. */
  priority?: number;
  /** Whether this camera takes part in arbitration and updates. */
  active?: boolean;
  /** Blend hints for transitions involving this camera. */
  hints?: BlendHints;
  /** How this camera updates while another one is on screen. */
  standbyUpdate?: StandbyUpdate;
  /** The `<VirtualCamera>`s the instructions name. */
  children?: ReactNode;
  ref?: Ref<SequencerCameraCore>;
};

/** Shows the `<VirtualCamera>`s inside one after another, and starts over whenever it becomes the active camera. */
export function SequencerCamera({
  name,
  priority = 0,
  active = true,
  hints = BlendHints.none,
  standbyUpdate = 'roundRobin',
  children,
  ref,
  ...settings
}: SequencerCameraProps) {
  const params = sequencer.createParams(settings);
  const [camera] = useState(() => new SequencerCameraCore(name, { priority, active, hints, ...params }));
  camera.standbyUpdate = standbyUpdate;
  Object.assign(camera, params);

  useImperativeHandle(ref, () => camera, [camera]);
  useInvalidateOnRender();
  const { isActive, isLive } = useCameraRegistration(camera, { name, priority, hints, active });
  const scope = useMemo<CameraMixerScope>(
    () => ({ mixer: camera.children, active: isActive, live: isLive }),
    [camera, isActive, isLive],
  );

  return <CameraMixerContext.Provider value={scope}>{children}</CameraMixerContext.Provider>;
}
