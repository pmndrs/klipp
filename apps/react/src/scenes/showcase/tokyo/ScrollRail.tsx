import type { PointerEvent, RefObject } from 'react';

import { pageLength, sectionStarts } from './layout';

/** A track down the side of the page with a mark for each section. Dragging it or clicking on it scrolls the page. */
export function ScrollRail({ story, scroll }: { story: RefObject<HTMLDivElement | null>; scroll: number }) {
  const scrollTo = (event: PointerEvent<HTMLDivElement>) => {
    const element = story.current;
    if (!element) return;
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientY - top) / height, 0), 1);
    element.scrollTo({ top: fraction * (element.scrollHeight - element.clientHeight) });
  };
  // Snapping pauses while dragging, so the shots follow the thumb all the way, and snaps again on release.
  const setDragging = (dragging: boolean) => story.current?.toggleAttribute('data-dragging', dragging);

  return (
    <div
      className="tokyo-rail"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        scrollTo(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) scrollTo(event);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}>
      {sectionStarts.map((start) => (
        <span key={start} className="tokyo-rail-mark" style={{ top: `${(start / pageLength) * 100}%` }} />
      ))}
      <span className="tokyo-rail-thumb" style={{ top: `${(Math.min(scroll, pageLength) / pageLength) * 100}%` }} />
    </div>
  );
}
