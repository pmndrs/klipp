import { useThree } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import * as positionComposer from '../../core/body/positionComposer';
import * as debugZones from '../../core/debug/debugZones';

import {
  PositionComposerBodyThree,
  type PositionComposerThreeOptions,
} from '../../three/body/PositionComposerBodyThree';
import { resolveVec3 } from '../../three/resolve/resolveVector3';
import type { Target } from '../../three/resolve/Target';

import { DebugZoneOverlay } from '../DebugZoneOverlay';
import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

export type PositionComposerProps = Omit<PositionComposerThreeOptions, 'aspect'> & {
  /** Target to compose around. Unresolved targets are ignored. */
  target?: Target;
  /** Draws the `deadZone` and `hardLimit` overlays. */
  debug?: boolean;
  ref?: Ref<PositionComposerBodyThree>;
};

/** Positions the camera around a target while maintaining screen composition. */
export function PositionComposer({ target, targetOffset, debug = false, ref, ...settings }: PositionComposerProps) {
  const camera = useVirtualCamera();
  const aspect = useThree((state) => state.viewport.aspect);
  const { targetOffset: defaultTargetOffset, ...params } = positionComposer.createParams({ ...settings, aspect });
  const [body] = useState(() => new PositionComposerBodyThree(target, params));
  body.target = target;
  Object.assign(body, params);
  resolveVec3(body.targetOffset, targetOffset ?? defaultTargetOffset);
  body.radius = settings.radius;
  body.size = settings.size;

  useImperativeHandle(ref, () => body, [body]);
  useInvalidateOnRender();
  useEffect(() => camera.setBody(body), [camera, body]);

  if (!debug) return null;
  return (
    <DebugZoneOverlay
      zones={debugZones.composer(body.screenPosition, body.deadZone, body.hardLimit)}
      crosshair={body.screenPosition}
    />
  );
}
