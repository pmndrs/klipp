import { useEffect, useRef, useState } from 'react';

import { useShortcut } from '../scene/useShortcut';

import type { Quality } from './useQuality';

const qualities: { value: Quality; label: string }[] = [
  { value: 'hd', label: 'HD' },
  { value: 'sd', label: 'SD' },
];

/**
 * A burger that opens the list of showcase scenes, each a link to its own `#slug`, and the HD/SD switch. An HD badge
 * sits on the burger while the quality is high.
 */
export function SceneMenu({
  scenes,
  current,
  quality,
  onQualityChange,
}: {
  scenes: { slug: string; label: string }[];
  current: string;
  quality: Quality | null;
  onQualityChange: (quality: Quality) => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useShortcut('Escape', () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={menu} className="scene-menu">
      <button
        type="button"
        className="scene-menu-toggle"
        aria-label="Scenes and quality"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        <span />
        <span />
        <span />
      </button>
      {open && (
        <div className="scene-menu-list">
          <p className="scene-menu-heading">Scenes</p>
          <ul>
            {scenes.map(({ slug, label }) => (
              <li key={slug}>
                <a
                  href={`#${slug}`}
                  aria-current={slug === current ? 'page' : undefined}
                  onClick={() => setOpen(false)}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="scene-menu-heading">Quality</p>
          <div className="scene-menu-quality" role="radiogroup" aria-label="Quality">
            {qualities.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={quality === value}
                onClick={() => onQualityChange(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
