import { createRef } from 'react';
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { ConfinerExtensionThree } from '../../../src/three/extension/ConfinerExtensionThree';

import type { ConfinerProps } from '../../../src/react/extension/Confiner';
import { Extension } from '../../../src/react/extension/Extension';

import { expectPropsReachInstance, mountInCamera } from '../wiring';

describe('Extension.Confiner', () => {
  it('registers an extension that keeps the camera inside its bounds every frame', async () => {
    const bounds = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const mounted = await mountInCamera(<Extension.Confiner bounds={bounds} />, { position: [0, 0, 5] });
    await mounted.frame();
    expect(mounted.state.position).toEqual([0, 0, 1]);
  });

  it('passes every prop to the same extension, on mount and when props change', async () => {
    await expectPropsReachInstance<ConfinerProps, ConfinerExtensionThree>(
      (props, ref) => <Extension.Confiner ref={ref} {...props} />,
      { bounds: [-1, -1, -1, 1, 1, 1], slowingDistance: 0.5 },
      { bounds: { center: [0, 0, 0], radius: 2 }, slowingDistance: 1 },
    );
  });

  it('stops confining the camera once unmounted', async () => {
    const ref = createRef<ConfinerExtensionThree>();
    const mounted = await mountInCamera(<Extension.Confiner ref={ref} bounds={[-1, -1, -1, 1, 1, 1]} />, {
      position: [0, 0, 5],
    });
    await mounted.frame();
    const extension = ref.current!;
    await mounted.update(null);

    extension.bounds = [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5];
    await mounted.frame();

    expect(mounted.state.position).toEqual([0, 0, 1]);
  });
});
