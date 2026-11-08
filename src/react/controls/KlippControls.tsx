import { useImperativeHandle, useState, type Ref } from 'react';

import * as orbitFollow from '../../core/body/orbitFollow';
import * as controls from '../../core/controls/controls';
import { BlendHints } from '../../core/blend/BlendHints';
import type { ControlsAxes } from '../../core/controls/controls';
import type { InputControllerConfig } from '../../core/input/inputMapping';

import { KlippControlsThree, type KlippControlsThreeOptions } from '../../three/controls/KlippControlsThree';
import { resolveVec3 } from '../../three/resolve/resolveVector3';

import { useCameraRegistration } from '../useCameraRegistration';
import { useInvalidateOnRender } from '../useInvalidateOnRender';
import { VirtualCamera, VirtualCameraProvider, type VirtualCameraProps } from '../VirtualCamera';

import { OrbitDebug } from '../body/OrbitFollow';
import { InputController, type InputControllerProps } from '../input/InputController';

type AxisName = keyof ControlsAxes<unknown>;

export type KlippControlsProps = Omit<VirtualCameraProps, 'ref'> &
  Omit<KlippControlsThreeOptions, 'priority' | 'active' | 'hints' | 'initialState' | 'standbyUpdate'> &
  Omit<InputControllerProps, 'target' | 'ref' | keyof InputControllerConfig> &
  InputControllerConfig<AxisName> & {
    /** Draws the orbit in the scene. */
    debug?: boolean;
    ref?: Ref<KlippControlsThree>;
  };

const axisNames: ControlsAxes<AxisName> = {
  horizontal: 'horizontal',
  vertical: 'vertical',
  zoom: 'zoom',
  panX: 'panX',
  panY: 'panY',
};

function applySettings(camera: KlippControlsThree, props: KlippControlsProps): void {
  const { target, panBounds, distance, minDistance, maxDistance, panSlowingDistance } = props;
  const { orbit, horizontal, vertical, zoom, pan } = props;
  camera.target = target;
  camera.panBounds = panBounds ?? null;
  Object.assign(camera, controls.createParams({ distance, minDistance, maxDistance, panSlowingDistance }));
  const { targetOffset, ...orbitSettings } = orbit ?? {};
  const { targetOffset: defaultTargetOffset, ...orbitParams } = orbitFollow.createParams(orbitSettings);
  Object.assign(camera.orbit, orbitParams);
  resolveVec3(camera.orbit.targetOffset, targetOffset ?? defaultTargetOffset);
  controls.applyAxisSettings(camera, { horizontal, vertical, zoom, pan });
}

/**
 * A camera the user orbits around a target, pans and zooms with the mouse or touch. Children add Extensions and Noises
 * like in `<VirtualCamera>`. Input props override the default mapping per source: `null` turns one off. The
 * right-click menu stays off unless `suppressContextMenu` is `false`.
 */
export function KlippControls(props: KlippControlsProps) {
  const {
    name,
    priority = 0,
    active = true,
    hints = BlendHints.none,
    initialState,
    standbyUpdate = 'roundRobin',
    target,
    panBounds,
    distance,
    minDistance,
    maxDistance,
    panSlowingDistance,
    orbit,
    horizontal,
    vertical,
    zoom,
    pan,
    mouseButtons,
    touches,
    wheel,
    pinch,
    suppressContextMenu = true,
    debug = false,
    children,
    ref,
    ...inputProps
  } = props;
  const [camera] = useState(
    () =>
      new KlippControlsThree(name, {
        priority,
        active,
        hints,
        initialState,
        target,
        panBounds,
        distance,
        minDistance,
        maxDistance,
        panSlowingDistance,
        orbit,
        horizontal,
        vertical,
        zoom,
        pan,
      }),
  );
  camera.standbyUpdate = standbyUpdate;
  applySettings(camera, props);

  useImperativeHandle(ref, () => camera, [camera]);
  useInvalidateOnRender();
  const { isActive, isLive } = useCameraRegistration(camera, { name, priority, hints, active });
  const mapping = controls.inputConfig(axisNames, { mouseButtons, touches, wheel, pinch });

  return (
    <VirtualCameraProvider camera={camera} isActive={isActive} isLive={isLive}>
      <InputController {...inputProps} {...mapping} target={camera} suppressContextMenu={suppressContextMenu} />
      {children}
      {debug && <OrbitDebug body={camera.orbit} />}
    </VirtualCameraProvider>
  );
}

KlippControls.Events = VirtualCamera.Events;
