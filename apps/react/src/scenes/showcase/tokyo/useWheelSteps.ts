import { useEffect, type RefObject } from 'react';

// Wheel events closer together than this belong to one turn of the wheel or one swipe on a touchpad.
const gestureGap = 150;
// How long a step may take to reach its stop before the wheel is let through again.
const stepTimeout = 1000;

type Stop = { top: number; free: boolean };

/**
 * One turn of the wheel moves the page one stop at most, so a quick double turn cannot skip a shot. Stops are the
 * `[data-stop]` elements; from one marked `data-stop="free"` down to the next, the wheel scrolls as usual.
 */
export function useWheelSteps(story: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = story.current;
    if (!element) return;
    let lastWheel = -Infinity;
    let target: number | null = null;
    let targetSetAt = 0;

    const stops = (): Stop[] => {
      const origin = element.getBoundingClientRect().top - element.scrollTop;
      return Array.from(element.querySelectorAll<HTMLElement>('[data-stop]'), (stop) => ({
        top: stop.getBoundingClientRect().top - origin,
        free: stop.dataset.stop === 'free',
      })).sort((a, b) => a.top - b.top);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      const now = performance.now();
      const sameGesture = now - lastWheel < gestureGap;
      lastWheel = now;
      const top = element.scrollTop;

      if (target !== null) {
        if (Math.abs(top - target) > 2 && now - targetSetAt < stepTimeout) {
          event.preventDefault();
          return;
        }
        target = null;
      }

      const all = stops();
      const at = all.findIndex((stop) => Math.abs(stop.top - top) < 2);
      if (at < 0) return;
      const down = event.deltaY > 0;
      const next = all[at + (down ? 1 : -1)];
      // Into a section that follows the scroll, the wheel scrolls through it as usual.
      if (!next || (down ? all[at].free : next.free)) return;
      event.preventDefault();
      if (sameGesture) return;
      target = next.top;
      targetSetAt = now;
      element.scrollTo({ top: next.top, behavior: 'smooth' });
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [story]);
}
