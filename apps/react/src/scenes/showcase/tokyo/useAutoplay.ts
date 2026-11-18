import { useEffect, type RefObject } from 'react';

import { layout, sectionStarts, type SectionId } from './layout';

/** Whether the page plays itself, for recording: `?autoplay` in the address. */
export const autoplay = new URLSearchParams(location.search).has('autoplay');

const start = (id: SectionId) => sectionStarts[layout.findIndex((section) => section.id === id)];
const end = (id: SectionId) => start(id) + layout.find((section) => section.id === id)!.screens - 1;

/** Seconds on the hero before the tour sets off. */
const lead = 1;

/** The tour: where the page moves next, in screens, in how many seconds, and how long it looks once there. */
const script: { to: number; duration: number; look: number }[] = [
  // Straight into the dive and down to the cat, a little slower than a scroll.
  { to: end('hero'), duration: 0.2, look: 3 },
  { to: start('dive'), duration: 0.4, look: 0 },
  { to: end('dive'), duration: 11, look: 0.6 },
  { to: start('mascot'), duration: 1.2, look: 2 },
  { to: start('mascot') + 1, duration: 1.2, look: 2 },
  { to: start('alley'), duration: 1, look: 0 },
  { to: end('alley'), duration: 5, look: 0 },
  { to: start('tram'), duration: 1.2, look: 0 },
  { to: end('tram'), duration: 7, look: 0 },
  { to: start('bird'), duration: 1.2, look: 4 },
  { to: start('outro'), duration: 1.2, look: 0 },
];

const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const cancelling = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * While `playing`, plays the tour from where the page is. Any input hands the page back, and so does the end of the
 * tour: both set `playing` back to `false`.
 */
export function useAutoplay(
  story: RefObject<HTMLDivElement | null>,
  playing: boolean,
  setPlaying: (playing: boolean) => void,
) {
  useEffect(() => {
    const element = story.current;
    if (!playing || !element) return;

    let frame = 0;
    let from = element.scrollTop / element.clientHeight;
    let move = script.findIndex(({ to }) => to > from + 0.01);
    if (move < 0) return setPlaying(false);
    // A recording starts on the hero for a moment; a tour asked for with the button sets off at once.
    let movedAt = performance.now() + (autoplay ? lead * 1000 : 0);

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const { to, duration, look } = script[move];
      const elapsed = (now - movedAt) / 1000;
      if (elapsed < 0) return;
      const t = Math.min(elapsed / duration, 1);
      element.scrollTop = (from + (to - from) * easeInOut(t)) * element.clientHeight;
      if (elapsed < duration + look) return;
      from = to;
      movedAt = now;
      if (++move === script.length) end();
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      for (const type of cancelling) removeEventListener(type, end);
    };
    const end = () => {
      stop();
      setPlaying(false);
    };
    for (const type of cancelling) addEventListener(type, end);
    frame = requestAnimationFrame(tick);
    return stop;
  }, [story, playing, setPlaying]);
}
