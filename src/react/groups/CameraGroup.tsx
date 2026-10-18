import { useMemo, type ReactNode } from 'react';

import { BlendHints } from '../../core/blend/BlendHints';
import type { CameraManager } from '../../core/groups/CameraManager';
import type { StandbyUpdate } from '../../core/VirtualCameraBase';

import { CameraMixerContext, type CameraMixerScope } from '../CameraMixerContext';
import { useCameraRegistration } from '../useCameraRegistration';
import { useInvalidateOnRender } from '../useInvalidateOnRender';

export type CameraGroupProps = {
  name: string;
  /** The active camera with the highest priority is on screen. */
  priority?: number;
  /** Whether this camera takes part in arbitration and updates. */
  active?: boolean;
  /** Blend hints for transitions involving this camera. */
  hints?: BlendHints;
  /** How this camera updates while another one is on screen. */
  standbyUpdate?: StandbyUpdate;
  /** The group's `<VirtualCamera>`s. */
  children?: ReactNode;
};

/** Registers `group` like any camera, and makes it the mixer the `<VirtualCamera>`s inside join. */
export function CameraGroup({
  group,
  name,
  priority = 0,
  active = true,
  hints = BlendHints.none,
  standbyUpdate = 'roundRobin',
  children,
}: CameraGroupProps & { group: CameraManager }) {
  group.standbyUpdate = standbyUpdate;
  useInvalidateOnRender();
  const { isActive, isLive } = useCameraRegistration(group, { name, priority, hints, active });
  const scope = useMemo<CameraMixerScope>(
    () => ({ mixer: group.children, active: isActive, live: isLive }),
    [group, isActive, isLive],
  );

  return <CameraMixerContext.Provider value={scope}>{children}</CameraMixerContext.Provider>;
}
