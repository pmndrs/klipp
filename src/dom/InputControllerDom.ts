import type { ConsumedInput } from '../core/input/consumedInput';
import { InputController } from '../core/input/InputController';

import { InputSystem } from './InputSystem';

/**
 * `InputController` reading mouse, touch, wheel and gesture input from a DOM element. The page keeps its own
 * scrolling and pinch zoom over the element unless `wheel` or `pinch` is mapped.
 */
export class InputControllerDom extends InputController {
  readonly inputSystem = new InputSystem();

  /** Listens to `element`, calling `onInput` for every event that changes the input. */
  connect = (element: HTMLElement, onInput?: () => void): void => {
    this.claimPageGestures();
    this.inputSystem.connect(element, onInput);
  };

  disconnect = (): void => {
    this.inputSystem.disconnect();
  };

  protected override readInput(): ConsumedInput {
    this.claimPageGestures();
    return this.inputSystem.consume(this.input);
  }

  private claimPageGestures(): void {
    const { wheel, safariGesture } = this.inputSystem;
    const zoom = !!this.config.pinch;
    wheel.preventPageScroll = !!this.config.wheel;
    wheel.preventPageZoom = zoom;
    safariGesture.preventPageZoom = zoom;
  }
}
