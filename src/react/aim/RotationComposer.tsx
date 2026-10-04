import { useThree } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import { DebugZoneOverlay } from '../DebugZoneOverlay';
import { resolveVec3 } from '../../three/resolve/resolveVector3';
import type { Target } from '../../three/resolve/Target';
import { useVirtualCamera } from '../VirtualCameraContext';
import { RotationComposerAimThree, type RotationComposerThreeOptions } from '../../three/aim/RotationComposerAimThree';
import * as rotationComposer from '../../core/aim/rotationComposer';
import * as debugZones from '../../core/debug/debugZones';

export type RotationComposerProps = Omit<RotationComposerThreeOptions, 'aspect'> & {
  /** Target to compose at `screenPosition`. Unresolved targets are ignored. */
  target?: Target;
  /** Draws the `deadZone` and `hardLimit` overlays. */
  debug?: boolean;
  ref?: Ref<RotationComposerAimThree>;
};

/** Keeps a target within a chosen screen region by rotating the camera. */
export function RotationComposer({ target, targetOffset, debug = false, ref, ...settings }: RotationComposerProps) {
  const camera = useVirtualCamera();
  const aspect = useThree((state) => state.viewport.aspect);
  const { targetOffset: defaultTargetOffset, ...params } = rotationComposer.createParams({ ...settings, aspect });
  const [aim] = useState(() => new RotationComposerAimThree(target, params));
  aim.target = target;
  Object.assign(aim, params);
  resolveVec3(aim.targetOffset, targetOffset ?? defaultTargetOffset);
  aim.radius = settings.radius;
  aim.size = settings.size;

  useImperativeHandle(ref, () => aim, [aim]);
  useEffect(() => camera.setAim(aim), [camera, aim]);

  if (!debug) return null;
  return (
    <DebugZoneOverlay
      zones={debugZones.composer(aim.screenPosition, aim.deadZone, aim.hardLimit)}
      crosshair={aim.screenPosition}
    />
  );
}
