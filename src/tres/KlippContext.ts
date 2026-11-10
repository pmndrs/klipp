import { inject, type InjectionKey } from 'vue';

import type { KlippThree } from '../three/KlippThree';

export const klippKey: InjectionKey<KlippThree> = Symbol('Klipp');

/** The `KlippThree` behind the nearest `<Klipp>`. */
export function useKlipp(): KlippThree {
  const klipp = inject(klippKey, null);
  if (!klipp) throw new Error('useKlipp must be used within a <Klipp>.');
  return klipp;
}
