import { useEffect, useState } from 'react';

/** While developing, `f` toggles free look over every shot. */
export function useFreeLookKey() {
  const [freeLook, setFreeLook] = useState(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'f') setFreeLook((on) => !on);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return freeLook;
}
