import type { SequencerCamera } from '@pmndrs/klipp';
import { useFrame } from '@react-three/fiber';
import { useRef, type PointerEvent, type RefObject } from 'react';

import { CanvasOverlay } from '../../../scene/CanvasOverlay';
import { useShortcut } from '../../../scene/useShortcut';

const icons = {
  previous: 'M6 5h2v14H6zM20 5v14L9.5 12z',
  next: 'M16 5h2v14h-2zM4 5v14l10.5-7z',
  play: 'M7 4.5v15L19.5 12z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
};

// Keeps focus off the buttons, so Space and the arrows stay shortcuts after a click.
const keepFocus = (event: PointerEvent) => event.preventDefault();

function IconButton({ icon, label, onClick }: { icon: keyof typeof icons; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="showcase-bar-button"
      aria-label={label}
      title={label}
      onPointerDown={keepFocus}
      onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d={icons[icon]} />
      </svg>
    </button>
  );
}

/**
 * Playback for the showcase sequence: previous, play/pause and next, also on the arrow keys and Space. One segment
 * per shot fills while the shot is held, and clicking it jumps there.
 */
export function ShowcaseBar({
  sequence,
  shotNames,
  paused,
  onPausedChange,
}: {
  sequence: RefObject<SequencerCamera | null>;
  shotNames: string[];
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
}) {
  const title = useRef<HTMLDivElement>(null);
  const segments = useRef<(HTMLButtonElement | null)[]>([]);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);

  useFrame(() => {
    const camera = sequence.current;
    if (!camera) return;
    const { index, held } = camera.sequence;
    const blending = camera.children.isBlending;
    camera.instructions.forEach(({ hold }, i) => {
      const holding = blending ? 0 : hold > 0 ? Math.min(1, held / hold) : 1;
      const progress = i < index ? 1 : i > index ? 0 : holding;
      segments.current[i]?.classList.toggle('is-current', i === index);
      if (fills.current[i]) fills.current[i]!.style.width = `${progress * 100}%`;
    });
    if (title.current) title.current.textContent = shotNames[index] ?? '';
  });

  const previous = () => sequence.current?.previous();
  const next = () => sequence.current?.next();
  const togglePaused = () => onPausedChange(!paused);
  useShortcut('ArrowLeft', previous);
  useShortcut('ArrowRight', next);
  useShortcut('Space', togglePaused);

  return (
    <CanvasOverlay>
      <div className="showcase-bar">
        <div className="showcase-bar-buttons">
          <IconButton icon="previous" label="Previous shot" onClick={previous} />
          <IconButton icon={paused ? 'play' : 'pause'} label={paused ? 'Play' : 'Pause'} onClick={togglePaused} />
          <IconButton icon="next" label="Next shot" onClick={next} />
        </div>
        <div className="showcase-bar-timeline">
          <div ref={title} className="showcase-bar-title" />
          <div className="showcase-bar-segments">
            {shotNames.map((name, i) => (
              <button
                key={name}
                ref={(el) => void (segments.current[i] = el)}
                type="button"
                className="showcase-bar-segment"
                aria-label={name}
                title={name}
                onPointerDown={keepFocus}
                onClick={() => sequence.current?.goTo(i)}>
                <span className="showcase-bar-segment-track">
                  <span ref={(el) => void (fills.current[i] = el)} className="showcase-bar-segment-fill" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </CanvasOverlay>
  );
}
