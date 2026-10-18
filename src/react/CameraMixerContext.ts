import { createContext, use } from 'react';

import type { CameraMixer } from '../core/CameraMixer';

/** The mixer cameras below join, and whether its cameras can be on screen at all. */
export type CameraMixerScope = { mixer: CameraMixer; active: boolean; live: boolean };

export const CameraMixerContext = createContext<CameraMixerScope | null>(null);

/** The nearest `<Klipp>` or camera group, which the cameras below join. */
export function useCameraMixer(): CameraMixerScope {
  const value = use(CameraMixerContext);
  if (!value) throw new Error('A virtual camera must be used within a <Klipp> or a camera group.');
  return value;
}
