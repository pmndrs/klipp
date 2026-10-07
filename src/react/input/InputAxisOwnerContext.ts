import { createContext } from 'react';

import type { InputAxisOwner } from '../../core/input/InputAxisOwner';

/** Set by a Body/Aim/Extension around its `children`, so a nested `<InputController>` finds its `inputAxes`. */
export const InputAxisOwnerContext = createContext<InputAxisOwner | null>(null);
