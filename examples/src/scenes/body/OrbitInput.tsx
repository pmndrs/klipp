import type { InputControllerDom } from '@kvvasuu/klipp/dom';
import { InputController } from '@kvvasuu/klipp/react';
import type { Ref } from 'react';

const orbitSource = { axes: { x: 'horizontal', y: 'vertical' }, gain: 0.3 };

/** Drag to orbit, scroll or pinch to zoom: the input every OrbitFollow scene shares. */
export function OrbitInput({ ref }: { ref?: Ref<InputControllerDom> }) {
  return (
    <InputController
      ref={ref}
      mouseButtons={{ left: orbitSource }}
      touches={{ one: orbitSource }}
      wheel={{ axis: 'radial', gain: 0.001, invert: true }}
      pinch={{ axis: 'radial', invert: true }}
    />
  );
}

export const orbitHint = 'drag: orbit\nwheel or pinch: zoom';
