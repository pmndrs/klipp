import { useTres } from '@tresjs/core';
import { defineComponent, markRaw, onMounted, onUnmounted, toRaw, watchEffect } from 'vue';

import * as follow from '../../core/body/follow';

import { FollowBodyThree, type FollowThreeOptions } from '../../three/body/FollowBodyThree';
import { resolveVec3 } from '../../three/resolve/resolveVector3';
import type { Target } from '../../three/resolve/Target';

import { useVirtualCamera } from '../VirtualCameraContext';

export type FollowProps = FollowThreeOptions & {
  /** Target to follow. Unresolved targets are ignored. */
  target?: Target;
};

/** Follows a target with a configurable offset and rotation frame. */
export const Follow = defineComponent(
  (props: FollowProps, { expose }) => {
    const camera = useVirtualCamera();
    const { invalidate } = useTres();
    const body = markRaw(new FollowBodyThree(toRaw(props.target)));

    watchEffect(() => {
      const { offset, ...params } = follow.createParams({
        damping: props.damping,
        rotationDamping: props.rotationDamping,
        maxSpeed: props.maxSpeed,
        bindingMode: props.bindingMode,
      });
      body.target = toRaw(props.target);
      Object.assign(body, params);
      resolveVec3(body.offset, toRaw(props.offset) ?? offset);
      invalidate();
    });

    let remove = (): void => {};
    onMounted(() => (remove = camera.setBody(body)));
    onUnmounted(() => remove());

    expose({ body });
    return () => null;
  },
  { name: 'Follow', props: ['target', 'offset', 'damping', 'rotationDamping', 'maxSpeed', 'bindingMode'] },
);
