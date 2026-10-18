import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { CameraOffsetExtensionThree } from '../../../src/three/extension/CameraOffsetExtensionThree';

import type { CameraOffsetProps } from '../../../src/react/extension/CameraOffset';
import { Extension } from '../../../src/react/extension/Extension';

import { expectPropsReachInstance, mountInCamera } from '../wiring';

describe('Extension.CameraOffset', () => {
  it('registers an extension that moves the camera in its own space every frame', async () => {
    const mounted = await mountInCamera(<Extension.CameraOffset offset={[1, 2, 3]} />, { position: [0, 0, 0] });
    await mounted.frame();
    expect(mounted.state.position).toEqual([1, 2, 3]);
  });

  it('passes every prop to the same extension, on mount and when props change', async () => {
    await expectPropsReachInstance<CameraOffsetProps, CameraOffsetExtensionThree>(
      (props, ref) => <Extension.CameraOffset ref={ref} {...props} />,
      { offset: [1, 0, 0], preserveComposition: false },
      { offset: [0, 2, 0], preserveComposition: true },
    );
  });

  it('stops moving the camera once unmounted', async () => {
    const ref = createRef<CameraOffsetExtensionThree>();
    const mounted = await mountInCamera(<Extension.CameraOffset ref={ref} offset={[1, 0, 0]} />);
    await mounted.frame();
    const extension = ref.current!;
    await mounted.update(null);
    await mounted.frame();
    const before = [...mounted.state.position];

    extension.offset[0] = 5;
    await mounted.frame();

    expect(mounted.state.position).toEqual(before);
  });
});
