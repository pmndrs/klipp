import { useFrame, useThree } from '@react-three/fiber';
import type { Vec3 } from 'math';
import { useEffect, useState, type ReactNode } from 'react';
import type { Camera } from 'three';

import * as klippState from '../core/klippState';
import type { Insets, KlippMode, KlippOptions } from '../core/Klipp';

import { KlippThree } from '../three/KlippThree';

import { CameraMixerContext, type CameraMixerScope } from './CameraMixerContext';
import { KlippContext, useKlipp } from './KlippContext';
import { useCameraEvent, type CameraTransitionEventProps } from './useCameraEvent';

/** Bound `dt` under `frameloop="demand"` so an idle gap does not jump the blend forward in one frame. */
const DEMAND_MODE_MAX_DELTA = 1 / 30;

export type KlippProps = Pick<KlippOptions, 'defaultBlend' | 'customBlends' | 'up' | 'insets' | 'insetsDamping'> & {
  children?: ReactNode;
  camera?: Camera;
  mode?: KlippMode;
};

const noInsets: Partial<Insets> = {};

/** Provides the camera driver and writes its output to the active camera. */
export function Klipp({
  children,
  defaultBlend,
  customBlends,
  up,
  insets = noInsets,
  insetsDamping = 0,
  camera: cameraProp,
  mode = 'enabled',
}: KlippProps) {
  const defaultCamera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const camera = cameraProp ?? defaultCamera;
  const [klipp] = useState(() => new KlippThree(camera, { defaultBlend, customBlends }));
  const [scope] = useState<CameraMixerScope>(() => ({ mixer: klipp, active: true, live: true }));
  klipp.camera = camera;
  klipp.mode = mode;
  klipp.up = up ?? (camera.up.toArray() as Vec3);
  klipp.setSize(size.width, size.height);
  klipp.setInsets(insets);
  klipp.insetsDamping = insetsDamping;
  Object.assign(klipp, klippState.createParams({ defaultBlend, customBlends }));

  // Children register their cameras before this runs, so it also asks for the first frame itself.
  useEffect(() => {
    const stop = klipp.subscribeFrameRequest(invalidate);
    invalidate();
    return stop;
  }, [klipp, invalidate]);

  useFrame((state, rawDelta) => {
    const delta = state.frameloop === 'demand' ? Math.min(rawDelta, DEMAND_MODE_MAX_DELTA) : rawDelta;
    if (klipp.update(delta)) state.invalidate();
  });

  return (
    <KlippContext.Provider value={klipp}>
      <CameraMixerContext.Provider value={scope}>{children}</CameraMixerContext.Provider>
    </KlippContext.Provider>
  );
}

/** Listen to transitions from every camera in the nearest `<Klipp>`. */
function KlippEvents({
  onActivated,
  onDeactivated,
  onBlendCreated,
  onBlendFinished,
  onCut,
}: CameraTransitionEventProps) {
  const klipp = useKlipp();

  useCameraEvent(klipp, 'activated', onActivated);
  useCameraEvent(klipp, 'deactivated', onDeactivated);
  useCameraEvent(klipp, 'blendCreated', onBlendCreated);
  useCameraEvent(klipp, 'blendFinished', onBlendFinished);
  useCameraEvent(klipp, 'cut', onCut);

  return null;
}

Klipp.Events = KlippEvents;
