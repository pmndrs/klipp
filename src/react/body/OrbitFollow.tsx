import { useFrame } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';

import * as orbitFollow from '../../core/body/orbitFollow';
import * as inputAxis from '../../core/input/axis';
import type { InputAxisParams } from '../../core/input/axis';
import type { InputAxis } from '../../core/input/InputAxis';
import { withDefaults } from '../../core/params';

import { OrbitFollowBodyThree, type OrbitFollowThreeOptions } from '../../three/body/OrbitFollowBodyThree';
import { OrbitFollowHelperThree } from '../../three/body/OrbitFollowHelperThree';
import { resolveVec3 } from '../../three/resolve/resolveVector3';
import type { Target } from '../../three/resolve/Target';

import { useVirtualCamera } from '../VirtualCameraContext';

import { InputAxisOwnerContext } from '../input/InputAxisOwnerContext';

/** Settings of one orbit axis. It starts at `center`, then input drives its value. */
export type OrbitFollowAxisSettings = Partial<Omit<InputAxisParams, 'value'>>;

export type OrbitFollowProps = OrbitFollowThreeOptions & {
  /** Target to orbit. Unresolved targets are ignored. */
  target?: Target;
  /** Angle around the target, in degrees. */
  horizontal?: OrbitFollowAxisSettings;
  /** Elevation above the target in degrees, or from the bottom to the top ring for `threeRing`. */
  vertical?: OrbitFollowAxisSettings;
  /** Natural log of the radius scale. */
  radial?: OrbitFollowAxisSettings;
  /** Draws the orbit in the scene. */
  debug?: boolean;
  ref?: Ref<OrbitFollowBodyThree>;
  /** Nested `<InputController>` picks up `horizontal`/`vertical`/`radial` without an explicit `target`. */
  children?: ReactNode;
};

function applyAxis(axis: InputAxis, defaults: Partial<InputAxisParams>, settings: OrbitFollowAxisSettings | undefined) {
  const params = withDefaults<InputAxisParams>(inputAxis.createParams(defaults), settings);
  params.value = axis.value;
  Object.assign(axis, params);
}

function applyAxes(body: OrbitFollowBodyThree, { horizontal, vertical, radial }: OrbitFollowProps) {
  const defaults = orbitFollow.createAxisSettings();
  applyAxis(body.horizontal, defaults.horizontal, horizontal);
  applyAxis(body.vertical, defaults.vertical, vertical);
  applyAxis(body.radial, defaults.radial, radial);
}

/** Orbits a target, driven by the `horizontal`, `vertical` and `radial` axes. */
export function OrbitFollow({
  target,
  targetOffset,
  horizontal,
  vertical,
  radial,
  debug = false,
  ref,
  children,
  ...settings
}: OrbitFollowProps) {
  const camera = useVirtualCamera();
  const { targetOffset: defaultTargetOffset, ...params } = orbitFollow.createParams(settings);
  const [body] = useState(() => {
    const created = new OrbitFollowBodyThree(target, params);
    applyAxes(created, { horizontal, vertical, radial });
    for (const axis of [created.horizontal, created.vertical, created.radial]) axis.setValue(axis.center);
    return created;
  });
  body.target = target;
  Object.assign(body, params);
  resolveVec3(body.targetOffset, targetOffset ?? defaultTargetOffset);
  applyAxes(body, { horizontal, vertical, radial });

  useImperativeHandle(ref, () => body, [body]);
  useEffect(() => camera.setBody(body), [camera, body]);

  return (
    <InputAxisOwnerContext.Provider value={body}>
      {children}
      {debug && <OrbitDebug body={body} />}
    </InputAxisOwnerContext.Provider>
  );
}

function OrbitDebug({ body }: { body: OrbitFollowBodyThree }) {
  const [helper] = useState(() => new OrbitFollowHelperThree());
  useEffect(() => () => helper.dispose(), [helper]);
  useFrame(() => helper.sync(body));
  return <primitive object={helper} />;
}
