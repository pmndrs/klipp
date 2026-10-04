import { useEffect, useImperativeHandle, type Ref } from 'react';

import type {
  BasicMultiChannelPerlinNoiseThree,
  PerlinNoiseThreeOptions,
} from '../../three/noise/BasicMultiChannelPerlinNoiseThree';

import { useVirtualCamera } from '../VirtualCameraContext';

import { useBasicMultiChannelPerlinNoise } from './useBasicMultiChannelPerlinNoise';

export type BasicMultiChannelPerlinProps = PerlinNoiseThreeOptions & {
  ref?: Ref<BasicMultiChannelPerlinNoiseThree>;
};

/** Adds position and rotation noise to the camera. */
export function BasicMultiChannelPerlin({ ref, ...props }: BasicMultiChannelPerlinProps) {
  const camera = useVirtualCamera();
  const noise = useBasicMultiChannelPerlinNoise(props);

  useImperativeHandle(ref, () => noise, [noise]);
  useEffect(() => camera.addNoise(noise), [camera, noise]);

  return null;
}
