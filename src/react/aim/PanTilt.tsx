import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';

import * as panTilt from '../../core/aim/panTilt';
import { applyAxisSettings } from '../../core/input/applyAxisSettings';
import type { InputAxisSettings } from '../../core/input/axis';

import { PanTiltAimThree } from '../../three/aim/PanTiltAimThree';
import type { Target } from '../../three/resolve/Target';

import { useVirtualCamera } from '../VirtualCameraContext';

import { InputAxisOwnerContext } from '../input/InputAxisOwnerContext';

export type PanTiltProps = {
  /** Makes `pan` and `tilt` relative to this target's rotation. Omitted, they turn around `referenceUp`. */
  target?: Target;
  /** Turning left and right, in degrees. */
  pan?: InputAxisSettings;
  /** Looking up and down, in degrees. */
  tilt?: InputAxisSettings;
  /** `pan.autoNormalize`: keeps it inside its range after each drag. */
  autoNormalize?: boolean;
  ref?: Ref<PanTiltAimThree>;
  /** Nested `<InputController>` picks up `pan`/`tilt` without an explicit `target`. */
  children?: ReactNode;
};

function applyAxes(aim: PanTiltAimThree, { pan, tilt, autoNormalize }: PanTiltProps) {
  const defaults = panTilt.createAxisSettings();
  defaults.pan.autoNormalize = autoNormalize;
  applyAxisSettings(aim.pan, defaults.pan, pan);
  applyAxisSettings(aim.tilt, defaults.tilt, tilt);
}

/** Turns the camera with two input axes, `pan` and `tilt`. */
export function PanTilt({ target, pan, tilt, autoNormalize = false, ref, children }: PanTiltProps) {
  const camera = useVirtualCamera();
  const [aim] = useState(() => {
    const created = new PanTiltAimThree(target);
    applyAxes(created, { pan, tilt, autoNormalize });
    for (const axis of [created.pan, created.tilt]) axis.setValue(axis.center);
    return created;
  });
  aim.target = target;
  applyAxes(aim, { pan, tilt, autoNormalize });

  useImperativeHandle(ref, () => aim, [aim]);
  useEffect(() => camera.setAim(aim), [camera, aim]);

  return <InputAxisOwnerContext.Provider value={aim}>{children}</InputAxisOwnerContext.Provider>;
}
