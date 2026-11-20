import { useEffect, useEffectEvent } from 'react';

import type { EventDispatcher } from '../core/EventDispatcher';
import type { CameraTransitionEventMap } from '../core/klippState';

/** Callback props for camera transition events. */
export type CameraTransitionEventProps = {
  onActivated?: (event: CameraTransitionEventMap['activated']) => void;
  onDeactivated?: (event: CameraTransitionEventMap['deactivated']) => void;
  onBlendCreated?: (event: CameraTransitionEventMap['blendCreated']) => void;
  onBlendFinished?: (event: CameraTransitionEventMap['blendFinished']) => void;
  onCut?: (event: CameraTransitionEventMap['cut']) => void;
};

/** Subscribe to one event of a camera or a mixer. Pass the event map of a camera with events of its own. */
export function useCameraEvent<
  TEventMap extends {} = CameraTransitionEventMap,
  T extends Extract<keyof TEventMap, string> = Extract<keyof TEventMap, string>,
>(dispatcher: EventDispatcher<TEventMap>, type: T, listener: ((event: TEventMap[T]) => void) | undefined): void {
  const onEvent = useEffectEvent((event: TEventMap[T]) => {
    listener?.(event);
  });

  useEffect(() => {
    dispatcher.addEventListener(type, onEvent);
    return () => dispatcher.removeEventListener(type, onEvent);
  }, [dispatcher, type]);
}
