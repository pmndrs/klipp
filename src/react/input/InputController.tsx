import { useThree } from '@react-three/fiber';
import { use, useEffect, useImperativeHandle, useState, type Ref, type RefObject } from 'react';

import type { InputAxisData } from '../../core/input/axis';
import type { InputAxisOwner } from '../../core/input/InputAxisOwner';
import type { InputAxisMapping, InputControllerConfig, InputSourceMapping } from '../../core/input/inputMapping';

import { InputControllerDom } from '../../dom/InputControllerDom';
import type { InteractiveArea } from '../../dom/InputSystem';

import { useKlipp } from '../KlippContext';
import { useIsActiveVirtualCamera, useIsLiveVirtualCamera, useVirtualCamera } from '../VirtualCameraContext';

import { InputAxisOwnerContext } from './InputAxisOwnerContext';

export type InputControllerProps = InputControllerConfig<string> & {
  /** Axis owner to drive, or a ref to one. Defaults to the nearest owner context, or else the virtual camera. */
  target?: InputAxisOwner | RefObject<InputAxisOwner | null>;
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

function resolveSource(owner: InputAxisOwner, source: InputSourceMapping<string> | null | undefined) {
  if (!source) return null;
  const x = source.axes.x === undefined ? undefined : resolveAxis(owner, source.axes.x);
  const y = source.axes.y === undefined ? undefined : resolveAxis(owner, source.axes.y);
  if (x === null || y === null) return null;
  return { axes: { x, y }, gain: source.gain, invert: source.invert };
}

function resolveAxisSource(owner: InputAxisOwner, source: InputAxisMapping<string> | null | undefined) {
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
    pinch: resolveAxisSource(owner, props.pinch),
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
        const { target } = binding.props;
        const owner = (target && 'current' in target ? target.current : target) ?? binding.contextOwner ?? camera;
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
