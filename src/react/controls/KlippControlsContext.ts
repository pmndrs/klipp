import { createContext, use } from 'react';

import type { KlippControlsThree } from '../../three/controls/KlippControlsThree';

export const KlippControlsContext = createContext<KlippControlsThree | null>(null);

/** The nearest `<KlippControls>`. */
export function useKlippControls(): KlippControlsThree {
  const value = use(KlippControlsContext);
  if (!value) throw new Error('<KlippControls.Events> must be used within a <KlippControls>.');
  return value;
}
