import { useProgress } from '@react-three/drei';

import logoUrl from '../assets/logo_loading.svg';

/** The animated logo over the view while three.js loads assets, fading out once they're in. */
export function LoadingScreen() {
  const { active, progress } = useProgress();

  return (
    <div className={`loading-screen${active ? '' : ' is-done'}`} aria-hidden={!active}>
      <img src={logoUrl} alt="Loading" className="loading-screen-logo" />
      <span className="loading-screen-progress">{Math.round(progress)}%</span>
    </div>
  );
}
