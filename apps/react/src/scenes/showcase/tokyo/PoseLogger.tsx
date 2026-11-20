import { useKlipp } from '@pmndrs/klipp/react';
import { useEffect } from 'react';

const formatVec3 = (v: ArrayLike<number>) => `[${Array.from(v, (x) => x.toFixed(2)).join(', ')}]`;

/** While developing, `p` logs the shot's position and look-at point, for laying out paths and shots. */
export function PoseLogger() {
  const klipp = useKlipp();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'p') return;
      const { position, lookAtTarget } = klipp.shot;
      console.info(`position ${formatVec3(position)} lookAt ${formatVec3(lookAtTarget)}`);
      const { transition, liveName } = klipp.state.blend;
      if (!transition.active) return;
      const to = transition.toName ? klipp.state.cameras.get(transition.toName)?.state : undefined;
      console.info(
        `blend ${liveName} -> ${transition.toName}, hints ${transition.hints}, ` +
          `from has target ${transition.from.hasTarget}, to has target ${to?.hasTarget}`,
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [klipp]);
  return null;
}
