import * as consumedInput from './consumedInput';
import * as inputMapping from './inputMapping';
import type { ConsumedInput } from './consumedInput';
import type { InputControllerConfig } from './inputMapping';

/** Maps per-frame input onto named axis pairs. Layers override `readInput`. */
export class InputController {
  config: InputControllerConfig;
  /** Whether input deltas are applied to the configured axes. */
  enabled = true;
  /** This frame's input. */
  readonly input: ConsumedInput = consumedInput.create();

  constructor(config: InputControllerConfig) {
    this.config = config;
  }

  /** Feeds every configured source's shaped delta and hold state into its axis pair. */
  update = (): void => {
    inputMapping.feedAxes(this.config, this.readInput(), this.enabled);
  };

  /** This frame's input, read from wherever the layer gets it. */
  protected readInput(): ConsumedInput {
    return this.input;
  }
}
