import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/** Requests a frame after every render and on unmount, so `frameloop="demand"` picks up prop changes. */
export function useInvalidateOnRender(): void {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  });
  useEffect(() => invalidate, [invalidate]);
}
