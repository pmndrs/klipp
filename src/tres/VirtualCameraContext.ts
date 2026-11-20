import { inject, type InjectionKey } from 'vue';

import type { VirtualCamera } from '../core/VirtualCamera';

export const virtualCameraKey: InjectionKey<VirtualCamera> = Symbol('VirtualCamera');

/** The nearest `<VirtualCamera>`, with its `state` and pieces. */
export function useVirtualCamera(): VirtualCamera {
  const camera = inject(virtualCameraKey, null);
  if (!camera) throw new Error('useVirtualCamera must be used within a <VirtualCamera>.');
  return camera;
}
