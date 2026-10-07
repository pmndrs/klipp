import { useThree } from '@react-three/fiber';
import { use, useEffect, useImperativeHandle, useState, type Ref, type RefObject } from 'react';

import type { InputAxisData } from '../../core/input/axis';
import type { InputAxisOwner } from '../../core/input/InputAxisOwner';
import type { InputControllerConfig, InputInvert } from '../../core/input/inputMapping';

import { InputControllerDom } from '../../dom/InputControllerDom';
import type { InteractiveArea } from '../../dom/InputSystem';

import { useKlipp } from '../KlippContext';
import { useIsActiveVirtualCamera, useIsLiveVirtualCamera, useVirtualCamera } from '../VirtualCameraContext';

import { InputAxisOwnerContext } from './InputAxisOwnerContext';

export type InputSourceConfig = {
  /** Axis names to drive for each source. */
  axes: { x: string; y: string };
  /** Multiplies the raw delta before it reaches the axes. */
  gain?: number;
  invert?: InputInvert;
};

export type InputAxisSourceConfig = {
  /** Axis name to drive. */
  axis: string;
  /** Multiplies the raw delta before it reaches the axis. */
  gain?: number;
  invert?: boolean;
};

export type InputControllerProps = {
  /** Axis owner to drive. Uses the nearest owner context when omitted, or else the virtual camera itself. */
  target?: RefObject<InputAxisOwner | null>;
  mouseButtons?: {
    left?: InputSourceConfig | null;
    right?: InputSourceConfig | null;
    middle?: InputSourceConfig | null;
  };
  touches?: {
    one?: InputSourceConfig | null;
    two?: InputSourceConfig | null;
    three?: InputSourceConfig | null;
  };
  /** Vertical wheel scrolling, in pixels. Scrolling up is positive, like spreading a pinch. */
  wheel?: InputAxisSourceConfig | null;
  /** Change in the distance between two fingers, in pixels. Spreading is positive. */
  touchPinch?: InputAxisSourceConfig | null;
  /** Trackpad pinch, as the change in `ln(scale)`. Spreading is positive. */
  trackpadPinch?: InputAxisSourceConfig | null;
  /** Wait until this camera is live before listening to input. */
  waitForBlend?: boolean;
  /** Whether input reaches the axes. Unmount the component to stop listening altogether. */
  enabled?: boolean;
  /** Suppresses the native right-click context menu. */
  suppressContextMenu?: boolean;
  /** Restricts drag/wheel start to a normalized rect of the element's bounds. */
  interactiveArea?: InteractiveArea | null;
  /** Lock diagonal two-finger input to pinch or rotation. */
  lockTouchAxis?: boolean;
  ref?: Ref<InputControllerDom>;
};

function resolveAxis(owner: InputAxisOwner, name: string): InputAxisData | null {
  const axis = owner.inputAxes[name];
  if (!axis) {
    console.warn(`<InputController>: no axis named "${name}" on target's inputAxes.`);
    return null;
  }
  return axis;
}

function resolveSource(owner: InputAxisOwner, source: InputSourceConfig | null | undefined) {
  if (!source) return null;
  const x = resolveAxis(owner, source.axes.x);
  const y = resolveAxis(owner, source.axes.y);
  if (!x || !y) return null;
  return { axes: { x, y }, gain: source.gain, invert: source.invert };
}

function resolveAxisSource(owner: InputAxisOwner, source: InputAxisSourceConfig | null | undefined) {
  if (!source) return null;
  const axis = resolveAxis(owner, source.axis);
  return axis && { axis, gain: source.gain, invert: source.invert };
}

function buildConfig(owner: InputAxisOwner, props: InputControllerProps): InputControllerConfig {
  return {
    mouseButtons: {
      left: resolveSource(owner, props.mouseButtons?.left),
      right: resolveSource(owner, props.mouseButtons?.right),
      middle: resolveSource(owner, props.mouseButtons?.middle),
    },
    touches: {
      one: resolveSource(owner, props.touches?.one),
      two: resolveSource(owner, props.touches?.two),
      three: resolveSource(owner, props.touches?.three),
    },
    wheel: resolveAxisSource(owner, props.wheel),
    touchPinch: resolveAxisSource(owner, props.touchPinch),
    trackpadPinch: resolveAxisSource(owner, props.trackpadPinch),
  };
}

/** What the config was last built from. */
type Binding = {
  props: InputControllerProps;
  contextOwner: InputAxisOwner | null;
  owner: InputAxisOwner | null;
  axes: InputAxisOwner['inputAxes'] | null;
  stale: boolean;
};

/** Connects DOM input sources to named axes on a camera component. */
export function InputController(props: InputControllerProps) {
  const {
    waitForBlend = true,
    enabled = true,
    suppressContextMenu = false,
    interactiveArea = null,
    lockTouchAxis = false,
    ref,
  } = props;
  const contextOwner = use(InputAxisOwnerContext);
  const camera = useVirtualCamera();
  const klipp = useKlipp();
  const isActive = useIsActiveVirtualCamera();
  const isLive = useIsLiveVirtualCamera();
  const shouldConnect = isActive && (waitForBlend ? isLive : true);
  const domElement = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);

  const [controller] = useState(() => new InputControllerDom({}));
  const [binding] = useState<Binding>(() => ({ props, contextOwner, owner: null, axes: null, stale: true }));
  useImperativeHandle(ref, () => controller, [controller]);

  controller.enabled = enabled;
  controller.inputSystem.suppressContextMenu = suppressContextMenu;
  controller.inputSystem.interactiveArea = interactiveArea;
  controller.inputSystem.lockTouchAxis = lockTouchAxis;

  useEffect(() => {
    binding.props = props;
    binding.contextOwner = contextOwner;
    binding.stale = true;
  });

  useEffect(
    () =>
      klipp.registerUpdate(() => {
        // Resolved per frame, since the camera's pieces can register after this or change later.
        const owner = binding.props.target?.current ?? binding.contextOwner ?? camera;
        if (binding.stale || owner !== binding.owner || owner.inputAxes !== binding.axes) {
          controller.config = buildConfig(owner, binding.props);
          binding.owner = owner;
          binding.axes = owner.inputAxes;
          binding.stale = false;
        }
        controller.update();
      }),
    [klipp, controller, binding, camera],
  );

  useEffect(() => {
    if (!shouldConnect) return;
    controller.connect(domElement, () => invalidate());
    return () => {
      controller.disconnect();
      // One more frame lets the axes see the buttons released by disconnecting.
      invalidate();
    };
  }, [controller, domElement, shouldConnect, invalidate]);

  return null;
}
