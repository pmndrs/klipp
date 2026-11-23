import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';

import * as lens from '../../core/extension/lens';
import { LensExtension, type LensOptions } from '../../core/extension/LensExtension';
import { applyAxisSettings } from '../../core/input/applyAxisSettings';

import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { useVirtualCamera } from '../VirtualCameraContext';

import { InputAxisOwnerContext } from '../input/InputAxisOwnerContext';

export type LensProps = LensOptions & {
  ref?: Ref<LensExtension>;
  /** Nested `<InputController>` picks up `zoom` without an explicit `target`. */
  children?: ReactNode;
};

/** Animates the camera lens without forcing a React re-render, and magnifies it with the `zoom` input axis. */
export function Lens({ ref, zoom, children, ...settings }: LensProps) {
  const camera = useVirtualCamera();
  const params = lens.createParams(settings);
  const [extension] = useState(() => new LensExtension({ ...params, zoom }));
  Object.assign(extension, params);
  applyAxisSettings(extension.zoom, lens.createAxisSettings().zoom, zoom);

  useImperativeHandle(ref, () => extension, [extension]);
  useInvalidateOnRender();
  useEffect(() => camera.addExtension(extension), [camera, extension]);

  return <InputAxisOwnerContext.Provider value={extension}>{children}</InputAxisOwnerContext.Provider>;
}
