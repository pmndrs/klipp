import { useImperativeHandle, useState, type Ref } from 'react';

import * as mixing from '../../core/groups/mixing';
import type { MixingParams } from '../../core/groups/mixing';
import { MixingCamera as MixingCameraCore } from '../../core/groups/MixingCamera';

import { CameraGroup, type CameraGroupProps } from './CameraGroup';

export type MixingCameraProps = CameraGroupProps &
  Partial<MixingParams> & {
    ref?: Ref<MixingCameraCore>;
  };

/** Mixes the `<VirtualCamera>`s inside by `weights` into one shot. */
export function MixingCamera({ weights, ref, ...group }: MixingCameraProps) {
  const params = mixing.createParams({ weights });
  const [camera] = useState(() => new MixingCameraCore(group.name, params));
  Object.assign(camera, params);
  useImperativeHandle(ref, () => camera, [camera]);

  return <CameraGroup group={camera} {...group} />;
}
