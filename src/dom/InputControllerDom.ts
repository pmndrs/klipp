import type { ConsumedInput } from '../core/input/consumedInput';
import { InputController } from '../core/input/InputController';

import { InputSystem } from './InputSystem';

/** `InputController` reading mouse, touch and wheel input from a DOM element. */
export class InputControllerDom extends InputController {
  readonly inputSystem = new InputSystem();

  connect = (element: HTMLElement): void => {
    this.inputSystem.connect(element);
  };

  disconnect = (): void => {
    this.inputSystem.disconnect();
  };

  protected override readInput(): ConsumedInput {
    return this.inputSystem.consume(this.input);
  }
}
