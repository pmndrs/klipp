import { defineComponent, markRaw, onMounted, onUnmounted, provide, toRaw, watchEffect } from 'vue';

import { BlendHints } from '../core/blend/BlendHints';
import type { StandbyUpdate } from '../core/VirtualCameraBase';

import { VirtualCameraThree, type InitialCameraState } from '../three/VirtualCameraThree';

import { useKlipp } from './KlippContext';
import { virtualCameraKey } from './VirtualCameraContext';

export type VirtualCameraProps = {
  name: string;
  /** The active camera with the highest priority is on screen. */
  priority?: number;
  /** Whether this camera takes part in arbitration and updates. */
  active?: boolean;
  /** Blend hints for transitions involving this camera. */
  hints?: BlendHints;
  /** Initial pose applied once when the camera mounts. */
  initialState?: InitialCameraState;
  /** How this camera updates while another one is on screen. */
  standbyUpdate?: StandbyUpdate;
};

/** Registers a virtual camera with the nearest `<Klipp>`. */
export const VirtualCamera = defineComponent(
  (props: VirtualCameraProps, { slots, expose }) => {
    const klipp = useKlipp();
    const camera = markRaw(new VirtualCameraThree(props.name, { initialState: toRaw(props.initialState) }));

    watchEffect(() => {
      camera.name = props.name;
      camera.priority = props.priority ?? 0;
      camera.hints = props.hints ?? BlendHints.none;
      camera.active = props.active ?? true;
      camera.standbyUpdate = props.standbyUpdate ?? 'roundRobin';
    });

    onMounted(() => klipp.add(camera));
    onUnmounted(() => klipp.remove(camera));

    provide(virtualCameraKey, camera);
    expose({ camera });
    return () => slots.default?.();
  },
  { name: 'VirtualCamera', props: ['name', 'priority', 'active', 'hints', 'initialState', 'standbyUpdate'] },
);
