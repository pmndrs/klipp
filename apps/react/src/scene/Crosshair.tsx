import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('pointerlockchange', onChange);
  return () => document.removeEventListener('pointerlockchange', onChange);
}

const isLocked = (): boolean => document.pointerLockElement !== null;

/** Center dot shown while Pointer Lock hides the cursor. */
export function Crosshair() {
  return useSyncExternalStore(subscribe, isLocked) ? <div className="pan-tilt-crosshair" /> : null;
}
