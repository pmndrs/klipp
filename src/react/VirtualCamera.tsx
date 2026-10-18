import { useImperativeHandle, useState, type ReactNode, type Ref } from 'react';

import { BlendHints } from '../core/blend/BlendHints';
import type { StandbyUpdate } from '../core/VirtualCameraBase';

import { VirtualCameraThree, type InitialCameraState } from '../three/VirtualCameraThree';

import { useCameraRegistration } from './useCameraRegistration';
import { useCameraTransitionEvent, type CameraTransitionEventProps } from './useCameraTransitionEvent';
import {
  useVirtualCamera,
  VirtualCameraActiveContext,
  VirtualCameraContext,
  VirtualCameraLiveContext,
} from './VirtualCameraContext';

export type VirtualCameraProps = {
  name: string;
  /** The active camera with the highest priority is on screen. */
  priority?: number;
  /** Whether this camera participates in arbitration and updates. */
  active?: boolean;
  /** Blend hints for transitions involving this camera. */
  hints?: BlendHints;
  /** Initial pose applied once when the camera mounts. */
  initialState?: InitialCameraState;
  /** How this camera updates while another one is on screen. */
  standbyUpdate?: StandbyUpdate;
  children?: ReactNode;
  ref?: Ref<VirtualCameraThree>;
};

/** Registers a virtual camera with the nearest `<Klipp>` or camera group. */
export function VirtualCamera({
  name,
  priority = 0,
  active = true,
  hints = BlendHints.none,
  initialState,
  standbyUpdate = 'roundRobin',
  children,
  ref,
}: VirtualCameraProps) {
  const [camera] = useState(() => new VirtualCameraThree(name, { priority, active, hints, initialState }));
  camera.standbyUpdate = standbyUpdate;
  useImperativeHandle(ref, () => camera, [camera]);
  const { isActive, isLive } = useCameraRegistration(camera, { name, priority, hints, active });

  return (
    <VirtualCameraContext.Provider value={camera}>
      <VirtualCameraActiveContext.Provider value={isActive}>
        <VirtualCameraLiveContext.Provider value={isLive}>{children}</VirtualCameraLiveContext.Provider>
      </VirtualCameraActiveContext.Provider>
    </VirtualCameraContext.Provider>
  );
}

export type VirtualCameraEventsProps = CameraTransitionEventProps;

/** Listen to transition events from the nearest virtual camera. */
export function VirtualCameraEvents({
  onActivated,
  onDeactivated,
  onBlendCreated,
  onBlendFinished,
  onCut,
}: VirtualCameraEventsProps) {
  const camera = useVirtualCamera();

  useCameraTransitionEvent(camera, 'activated', onActivated);
  useCameraTransitionEvent(camera, 'deactivated', onDeactivated);
  useCameraTransitionEvent(camera, 'blendCreated', onBlendCreated);
  useCameraTransitionEvent(camera, 'blendFinished', onBlendFinished);
  useCameraTransitionEvent(camera, 'cut', onCut);

  return null;
}

VirtualCamera.Events = VirtualCameraEvents;
