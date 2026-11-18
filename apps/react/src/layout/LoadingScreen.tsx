import { useProgress } from '@react-three/drei';

import logoUrl from '../assets/logo_loading.svg';

/**
 * The animated logo over the view while three.js loads assets, and until `ready` if the scene has more to prepare.
 * Fades out once both are done.
 */
export function LoadingScreen({ ready = true }: { ready?: boolean }) {
  const { active, progress } = useProgress();
  const shown = active || !ready;

  return (
    <div className={`loading-screen${shown ? '' : ' is-done'}`} aria-hidden={!shown}>
      <img src={logoUrl} alt="Loading" className="loading-screen-logo" />
      <span className="loading-screen-progress">{Math.round(progress)}%</span>
    </div>
  );
}
