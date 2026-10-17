import { useThree } from '@react-three/fiber';
import { useEffect, useSyncExternalStore } from 'react';

import type { BlendHints } from '../core/blend/BlendHints';
import type { VirtualCameraBase } from '../core/VirtualCameraBase';

import { useCameraMixer } from './CameraMixerContext';

type Registration = { name: string; priority: number; hints: BlendHints; active: boolean };

/**
 * Keeps `camera` in the nearest mixer with these settings. A camera in a group is active and live only while
 * the group is too.
 */
export function useCameraRegistration(
  camera: VirtualCameraBase,
  { name, priority, hints, active }: Registration,
): { isActive: boolean; isLive: boolean } {
  const { mixer, active: mixerActive, live: mixerLive } = useCameraMixer();
  const invalidate = useThree((state) => state.invalidate);

  // Settings first, so a (re)registration below already uses them.
  useEffect(() => {
    camera.name = name;
  }, [camera, name]);

  useEffect(() => {
    camera.priority = priority;
    if (camera.active) invalidate();
  }, [camera, priority, invalidate]);

  useEffect(() => {
    camera.hints = hints;
  }, [camera, hints]);

  useEffect(() => {
    camera.active = active;
    invalidate();
  }, [camera, active, invalidate]);

  useEffect(() => {
    const remove = mixer.add(camera);
    invalidate();
    return () => {
      remove();
      invalidate();
    };
  }, [mixer, camera, invalidate]);

  const isActive = useSyncExternalStore(
    mixer.subscribeActiveCamera,
    () => mixerActive && active && mixer.isActive(name),
  );
  const isLive = useSyncExternalStore(mixer.subscribeLiveCamera, () => mixerLive && active && mixer.isLive(name));
  return { isActive, isLive };
}
