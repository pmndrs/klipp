import { useLoop, useTres } from '@tresjs/core';
import { PerspectiveCamera } from 'three';
import { defineComponent, markRaw, onUnmounted, provide, toRaw, watchEffect } from 'vue';

import * as klippState from '../core/klippState';
import type { KlippMode, KlippOptions } from '../core/Klipp';

import { KlippThree } from '../three/KlippThree';

import { klippKey } from './KlippContext';

export type KlippProps = Pick<KlippOptions, 'defaultBlend' | 'customBlends'> & {
  mode?: KlippMode;
};

/** Provides the camera driver and writes its output to the active Tres camera. */
export const Klipp = defineComponent(
  (props: KlippProps, { slots }) => {
    const { camera, sizes, invalidate } = useTres();
    const klipp = markRaw(new KlippThree(toRaw(camera.value) ?? new PerspectiveCamera()));

    watchEffect(() => {
      const current = toRaw(camera.value);
      if (current) klipp.camera = current;
      klipp.mode = props.mode ?? 'enabled';
      klipp.setSize(sizes.width.value, sizes.height.value);
      Object.assign(
        klipp,
        klippState.createParams({ defaultBlend: props.defaultBlend, customBlends: props.customBlends }),
      );
    });

    // Subscribed during setup, before the children register their cameras.
    const stop = klipp.subscribeFrameRequest(invalidate);
    onUnmounted(stop);

    const { off } = useLoop().onBeforeRender(({ delta }) => {
      if (klipp.update(delta)) invalidate();
    });
    onUnmounted(off);

    provide(klippKey, klipp);
    return () => slots.default?.();
  },
  { name: 'Klipp', props: ['mode', 'defaultBlend', 'customBlends'] },
);
