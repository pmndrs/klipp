import type { ConsumedInput } from '../core/input/consumedInput';
import { InputController } from '../core/input/InputController';

import { InputSystem } from './InputSystem';

/** `InputController` reading mouse, touch, wheel and gesture input from a DOM element. */
export class InputControllerDom extends InputController {
  readonly inputSystem = new InputSystem();

  /** Listens to `element`, calling `onInput` for every event that changes the input. */
  connect = (element: HTMLElement, onInput?: () => void): void => {
    this.inputSystem.connect(element, onInput);
  };

  disconnect = (): void => {
    this.inputSystem.disconnect();
  };

  protected override readInput(): ConsumedInput {
    return this.inputSystem.consume(this.input);
  }
}
