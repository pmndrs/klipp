import { spline } from '@pmndrs/klipp';
import type { SplineDollyBodyThree } from '@pmndrs/klipp/three';
import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';

// Close enough to the end of its way, in world units, for the next shot to take over without it showing.
const arriveWithin = 0.05;

/** While `waiting`, calls `onArrive` once the damped dolly has caught up with where it heads. */
export function useArrival(
  dolly: RefObject<SplineDollyBodyThree | null>,
  waiting: boolean,
  onArrive: () => void,
): void {
  useFrame(() => {
    const body = dolly.current;
    if (!waiting || !body?.spline) return;
    const heading = spline.toDistance(body.spline, body.state.position, body.positionUnits);
    if (Math.abs(body.state.distance - heading) < arriveWithin) onArrive();
  });
}
