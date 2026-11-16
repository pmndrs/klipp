// The sections down the page, in screens. Those that follow the scroll play out as it moves through them.
export const layout = [
  { id: 'hero', screens: 1 },
  { id: 'mascot', screens: 2 },
  { id: 'alley', screens: 2 },
  { id: 'tram', screens: 3 },
] as const;

export type SectionId = (typeof layout)[number]['id'];

export const sectionStarts = layout.map((_, index) =>
  layout.slice(0, index).reduce((sum, { screens }) => sum + screens, 0),
);

/** How far the page scrolls, in screens: the last section ends at the bottom of the screen. */
export const pageLength = layout.reduce((sum, { screens }) => sum + screens, 0) - 1;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/** The section in the middle of the screen, the screen of it showing, and how far the scroll is through it. */
export function locate(scroll: number): { id: SectionId; step: number; progress: number } {
  let found: { id: SectionId; screens: number; start: number } = { ...layout[0], start: 0 };
  layout.forEach((section, index) => {
    if (scroll >= sectionStarts[index] - 0.5) found = { ...section, start: sectionStarts[index] };
  });
  const local = scroll - found.start;
  return {
    id: found.id,
    step: Math.min(Math.max(Math.round(local), 0), found.screens - 1),
    progress: clamp01(local / Math.max(found.screens - 1, 1)),
  };
}
