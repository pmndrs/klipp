import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import type { BasicMultiChannelPerlinProps } from '../noise/BasicMultiChannelPerlin';
import { useBasicMultiChannelPerlinNoise } from '../noise/useBasicMultiChannelPerlinNoise';
import { useVirtualCamera } from '../VirtualCameraContext';
import { ImpulseListenerNoise, type ImpulseListenerOptions } from '../../core/impulse/ImpulseListenerNoise';
import * as impulseListener from '../../core/impulse/impulseListener';

/** Perlin shake options driven by the current impulse strength. */
export type ImpulseShakeProps = Omit<BasicMultiChannelPerlinProps, 'amplitudeGain' | 'ref'>;

export type ImpulseListenerProps = Omit<ImpulseListenerOptions, 'shake'> & {
  /** Optional Perlin shake driven by the impulse strength. */
  shake?: ImpulseShakeProps;
  ref?: Ref<ImpulseListenerNoise>;
};

/** Adds impulse-driven camera shake and kick. */
export function ImpulseListener({ shake, ref, ...settings }: ImpulseListenerProps) {
  const camera = useVirtualCamera();
  const params = impulseListener.createParams(settings);
  const [listener] = useState(() => new ImpulseListenerNoise(params));
  Object.assign(listener, params);

  useImperativeHandle(ref, () => listener, [listener]);
  useEffect(() => camera.addNoise(listener), [camera, listener]);

  return shake ? <ImpulseListenerShake listener={listener} {...shake} /> : null;
}

/** Mounts the optional Perlin shake. */
function ImpulseListenerShake({ listener, ...props }: ImpulseShakeProps & { listener: ImpulseListenerNoise }) {
  const shakeNoise = useBasicMultiChannelPerlinNoise(props);

  useEffect(() => {
    listener.shake = shakeNoise;
    return () => {
      listener.shake = undefined;
    };
  }, [listener, shakeNoise]);

  return null;
}
