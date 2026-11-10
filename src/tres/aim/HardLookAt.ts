import { useTres } from '@tresjs/core';
import { defineComponent, markRaw, onMounted, onUnmounted, toRaw, watchEffect } from 'vue';

import { HardLookAtAimThree } from '../../three/aim/HardLookAtAimThree';
import type { Target } from '../../three/resolve/Target';

import { useVirtualCamera } from '../VirtualCameraContext';

export type HardLookAtProps = {
  /** Target to look at. Unresolved targets are ignored. */
  target?: Target;
};

/** Rotates the camera to look straight at a target. */
export const HardLookAt = defineComponent(
  (props: HardLookAtProps, { expose }) => {
    const camera = useVirtualCamera();
    const { invalidate } = useTres();
    const aim = markRaw(new HardLookAtAimThree(toRaw(props.target)));

    watchEffect(() => {
      aim.target = toRaw(props.target);
      invalidate();
    });

    let remove = (): void => {};
    onMounted(() => (remove = camera.setAim(aim)));
    onUnmounted(() => remove());

    expose({ aim });
    return () => null;
  },
  { name: 'HardLookAt', props: ['target'] },
);
