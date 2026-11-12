import type { KlippControls } from '../core/controls/KlippControls';
import type { InputControllerConfig } from '../core/input/inputMapping';
import type { Klipp } from '../core/Klipp';

import { InputControllerDom } from './InputControllerDom';
import type { InteractiveArea } from './InputSystem';

export type ConnectControlsOptions = InputControllerConfig & {
  /** Share of the shot the camera needs before it takes input, from `0` to `1`. */
  blendThreshold?: number;
  /** Disable the right-click menu on the element, so the right button can pan. */
  suppressContextMenu?: boolean;
  /** Only take drags, scrolls and pinches that start inside this part of the element. */
  interactiveArea?: InteractiveArea | null;
  /** For two-finger gestures, pick either pinch or rotate instead of both. */
  lockTouchAxis?: boolean;
};

export type ControlsConnection = {
  /** The controller feeding the axes, for `enabled`, pointer lock on `inputSystem` or raw `input`. */
  controller: InputControllerDom;
  /** Stops taking input from the element. */
  stop: () => void;
};

/**
 * Drives `controls` with mouse, touch, wheel and pinch input from `element` while the camera is on screen, asking
 * `klipp` for a frame on every input. Each source in `options` replaces its default mapping, and `null` turns it off.
 */
export function connectControls(
  klipp: Klipp,
  controls: KlippControls<unknown, unknown>,
  element: HTMLElement,
  options: ConnectControlsOptions = {},
): ControlsConnection {
  const {
    blendThreshold = 1,
    suppressContextMenu = true,
    interactiveArea = null,
    lockTouchAxis = false,
    ...sources
  } = options;
  const controller = new InputControllerDom(controls.inputConfig(sources));
  Object.assign(controller.inputSystem, { suppressContextMenu, interactiveArea, lockTouchAxis });
  const stopWatching = controls.whileOnScreen(
    () => {
      controller.connect(element, () => klipp.requestFrame());
      return controller.disconnect;
    },
    { blendThreshold },
  );
  const stopUpdating = klipp.registerUpdate(controller.update);
  return {
    controller,
    stop: () => {
      stopWatching();
      stopUpdating();
    },
  };
}
