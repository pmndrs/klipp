import { useCallback, useEffect, useState } from 'react';

import { useShortcut } from './useShortcut';

/** `R` leaves only a square scene and Leva on screen, for recording clips. */
export function useRecordingMode(): void {
  const [recording, setRecording] = useState(false);
  useShortcut(
    'KeyR',
    useCallback(() => setRecording((on) => !on), []),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('recording', recording);
  }, [recording]);
}
