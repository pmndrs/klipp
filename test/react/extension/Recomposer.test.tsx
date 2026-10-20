import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { RecomposerExtension } from '../../../src/core/extension/RecomposerExtension';

import { Extension } from '../../../src/react/extension/Extension';
import type { RecomposerProps } from '../../../src/react/extension/Recomposer';

import { expectPropsReachInstance, mountInCamera } from '../wiring';

describe('Extension.Recomposer', () => {
  it('registers an extension that recomposes the shot every frame', async () => {
    const mounted = await mountInCamera(<Extension.Recomposer zoomScale={0.5} />, { fov: 60 });
    await mounted.frame();
    expect(mounted.state.fov).toBe(30);
  });

  it('passes every prop to the same extension, on mount and when props change', async () => {
    await expectPropsReachInstance<RecomposerProps, RecomposerExtension>(
      (props, ref) => <Extension.Recomposer ref={ref} {...props} />,
      { tilt: 5, pan: 10, dutch: 15, zoomScale: 0.8 },
      { tilt: -5, pan: -10, dutch: -15, zoomScale: 1.2 },
    );
  });

  it('stops recomposing the shot once unmounted', async () => {
    const ref = createRef<RecomposerExtension>();
    const mounted = await mountInCamera(<Extension.Recomposer ref={ref} zoomScale={0.5} />, { fov: 60 });
    await mounted.frame();
    const extension = ref.current!;
    await mounted.update(null);
    await mounted.frame();

    extension.zoomScale = 0.1;
    await mounted.frame();

    expect(mounted.state.fov).toBe(60);
  });
});
