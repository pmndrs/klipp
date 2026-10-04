import * as consumedInput from '../core/input/consumedInput';
import * as inputMapping from '../core/input/inputMapping';
import type { ConsumedInput } from '../core/input/consumedInput';
import type { InputAxisControllerConfig } from '../core/input/inputMapping';

import { InputSystem } from './InputSystem';

export type {
  InputAxisControllerConfig,
  InputAxisPair,
  InputInvert,
  InputSourceMapping,
} from '../core/input/inputMapping';

/** Maps DOM input onto named axis pairs. */
export class InputAxisController {
  readonly inputSystem = new InputSystem();
  config: InputAxisControllerConfig;
  /** Whether input deltas are applied to the configured axes. */
  enabled = true;

  /* Reused values drained from the input system each frame. */
  readonly lastInput: ConsumedInput = consumedInput.create();

  constructor(config: InputAxisControllerConfig) {
    this.config = config;
  }

  connect = (element: HTMLElement): void => {
    this.inputSystem.connect(element);
  };

  disconnect = (): void => {
    this.inputSystem.disconnect();
  };

  /** Drains `InputSystem` and feeds every configured source's shaped delta into its axis pair. */
  update = (): void => {
    inputMapping.feedAxes(this.config, this.inputSystem.consume(this.lastInput), this.enabled);
  };
}
