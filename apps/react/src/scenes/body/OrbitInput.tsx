import { InputController } from '@pmndrs/klipp/react';

const orbitSource = { axes: { x: 'horizontal', y: 'vertical' }, gain: 0.3 };

/** Drag to orbit, scroll or pinch to zoom: the input every OrbitFollow scene shares. */
export function OrbitInput({ pointerLock = false }: { pointerLock?: boolean }) {
  return (
    <InputController
      mouseButtons={{ left: orbitSource }}
      touches={{ one: orbitSource }}
      wheel={{ axis: 'radial', gain: 0.001, invert: true }}
      pinch={{ axis: 'radial', invert: true }}
      blendThreshold={0}
      pointerLock={pointerLock}
    />
  );
}

export const orbitHint = 'drag: orbit\nwheel or pinch: zoom';
