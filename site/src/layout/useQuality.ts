import { getGPUTier } from 'detect-gpu';
import { useCallback, useEffect, useState } from 'react';

export type Quality = 'hd' | 'sd';

const storageKey = 'klipp-quality';

function savedQuality(): Quality | null {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved === 'hd' || saved === 'sd' ? saved : null;
  } catch {
    return null;
  }
}

/**
 * The showcase's quality: the viewer's own pick if they made one, otherwise HD unless the GPU is known to be weak or
 * known to be a phone's. `null` while the GPU is still being checked.
 */
export function useQuality(): [Quality | null, (quality: Quality) => void] {
  const [quality, setQuality] = useState(savedQuality);

  useEffect(() => {
    if (quality) return;
    let cancelled = false;
    getGPUTier()
      .then(({ type, tier, isMobile }) => (type === 'BENCHMARK' && (tier < 2 || isMobile) ? 'sd' : 'hd'))
      .catch((): Quality => 'hd')
      .then((detected) => !cancelled && setQuality(detected));
    return () => {
      cancelled = true;
    };
  }, [quality]);

  const pick = useCallback((next: Quality) => {
    setQuality(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Without storage the pick still holds until the page reloads.
    }
  }, []);

  return [quality, pick];
}
