import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { FollowZoomExtensionThree } from '../../../src/three/extension/FollowZoomExtensionThree';

import { Extension } from '../../../src/react/extension/Extension';
import type { FollowZoomProps } from '../../../src/react/extension/FollowZoom';

import { expectPropsReachInstance, mountInCamera } from '../wiring';

describe('Extension.FollowZoom', () => {
  it('registers an extension that keeps the shot width at the target every frame', async () => {
    const ref = createRef<FollowZoomExtensionThree>();
    const mounted = await mountInCamera(<Extension.FollowZoom ref={ref} target={[0, 0, -10]} width={4} damping={0} />, {
      position: [0, 0, 0],
    });
    await mounted.frame();
    const expected = (2 * Math.atan(4 / ref.current!.aspect / 20) * 180) / Math.PI;
    expect(mounted.state.fov).toBeCloseTo(expected, 10);
  });

  it('passes every prop to the same extension, on mount and when props change', async () => {
    await expectPropsReachInstance<FollowZoomProps, FollowZoomExtensionThree>(
      (props, ref) => <Extension.FollowZoom ref={ref} {...props} />,
      { target: [0, 0, -10], width: 4, damping: 0.5, fovRange: [5, 50] },
      { target: [0, 1, -8], width: 2, damping: 1, fovRange: [10, 70] },
    );
  });

  it('gives the camera back its own field of view once unmounted, and stops zooming', async () => {
    const ref = createRef<FollowZoomExtensionThree>();
    const mounted = await mountInCamera(<Extension.FollowZoom ref={ref} target={[0, 0, -10]} damping={0} />, {
      fov: 40,
    });
    await mounted.frame();
    const extension = ref.current!;
    await mounted.update(null);
    await mounted.frame();
    expect(mounted.state.fov).toBe(40);

    extension.width = 20;
    await mounted.frame();

    expect(mounted.state.fov).toBe(40);
  });
});
