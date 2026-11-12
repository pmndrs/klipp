import { useEffect, useEffectEvent } from 'react';

import type { WhileOnScreenOptions } from '../core/VirtualCameraBase';

import { useVirtualCamera } from './VirtualCameraContext';

const noop = (): void => {};

/**
 * Calls `start` while the nearest virtual camera is on screen, and the function it returns once it leaves or this
 * unmounts. On screen means its share of the shot is at least `blendThreshold`.
 */
export function useWhileOnScreen(
  start: () => (() => void) | void,
  { blendThreshold = 1 }: WhileOnScreenOptions = {},
): void {
  const camera = useVirtualCamera();
  const onStart = useEffectEvent(start);
  useEffect(() => camera.whileOnScreen(() => onStart() ?? noop, { blendThreshold }), [camera, blendThreshold]);
}
