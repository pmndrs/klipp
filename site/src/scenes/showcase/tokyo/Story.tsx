import type { ReactNode, Ref } from 'react';

/** The page scrolling over the scene. Reports how far it is scrolled, in screens, and marks the hero for the logo. */
export function Story({
  atHero,
  onScroll,
  freeLook,
  ref,
  children,
}: {
  atHero: boolean;
  onScroll: (screens: number) => void;
  freeLook: boolean;
  ref: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div
      ref={ref}
      className="tokyo-story"
      data-at-hero={atHero ? '' : undefined}
      data-free-look={freeLook ? '' : undefined}
      onScroll={(event) => {
        const { scrollTop, clientHeight } = event.currentTarget;
        onScroll(scrollTop / clientHeight);
      }}>
      {children}
    </div>
  );
}

/**
 * One section of the page, `screens` tall, with its card held in place throughout. A section that follows the scroll
 * is a snap area as a whole, taller than the screen, so the page can rest anywhere inside it.
 */
export function Chapter({
  title,
  screens = 1,
  follows = false,
  children,
}: {
  title: string;
  screens?: number;
  follows?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="tokyo-chapter" data-follows={follows ? '' : undefined} style={{ height: `${screens * 100}%` }}>
      {!follows &&
        Array.from({ length: screens }, (_, snap) => (
          <span key={snap} className="tokyo-snap" style={{ top: `${(snap / screens) * 100}%` }} />
        ))}
      <div className="tokyo-chapter-screen">
        <div className="tokyo-card">
          <h3>{title}</h3>
          {children}
        </div>
      </div>
    </section>
  );
}
