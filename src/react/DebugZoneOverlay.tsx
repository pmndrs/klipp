import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';

import type { DebugZone } from '../core/debug/debugZones';

import { DebugOverlay } from '../dom/DebugOverlay';

import { useIsActiveVirtualCamera } from './VirtualCameraContext';

/** Renders debug zones and an optional crosshair while this camera is the active one. */
export function DebugZoneOverlay({ zones, crosshair }: { zones: DebugZone[]; crosshair?: [number, number] }): null {
  const isActive = useIsActiveVirtualCamera();
  const container = useThree((state) => state.gl.domElement.parentElement);
  const [overlay] = useState(() => new DebugOverlay());

  useEffect(() => {
    if (!container) return;
    overlay.connect(container);
    return overlay.disconnect;
  }, [container, overlay]);

  useEffect(() => {
    if (isActive) overlay.render(zones, crosshair);
    else overlay.render([]);
  });

  return null;
}
