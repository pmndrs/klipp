import type { MixingCamera } from '@pmndrs/klipp';
import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';

import { CanvasOverlay } from '../../scene/CanvasOverlay';

/** Each child's share of the shot, its weight over the sum, as a bar that follows the weights every frame. */
export function MixShares({
  mix,
  colors,
  status,
}: {
  mix: RefObject<MixingCamera | null>;
  colors: Record<string, string>;
  status?: () => string;
}) {
  const names = Object.keys(colors);
  const segments = useRef<(HTMLDivElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const statusLine = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const weights = mix.current?.weights;
    if (!weights) return;
    let total = 0;
    for (const name of names) total += Math.max(0, weights[name] ?? 0);
    names.forEach((name, i) => {
      const share = total > 0 ? Math.max(0, weights[name] ?? 0) / total : 0;
      if (segments.current[i]) segments.current[i]!.style.width = `${share * 100}%`;
      if (labels.current[i]) labels.current[i]!.textContent = `${name} ${Math.round(share * 100)}%`;
    });
    if (statusLine.current && status) statusLine.current.textContent = status();
  });

  return (
    <CanvasOverlay>
      <div className="mix-shares">
        <div className="mix-bar">
          {names.map((name, i) => (
            <div
              key={name}
              ref={(el) => void (segments.current[i] = el)}
              className="mix-segment"
              style={{ background: colors[name] }}
            />
          ))}
        </div>
        <div className="mix-labels">
          {names.map((name, i) => (
            <span
              key={name}
              ref={(el) => void (labels.current[i] = el)}
              className="mix-label"
              style={{ color: colors[name] }}
            />
          ))}
        </div>
        {status && <div ref={statusLine} className="sequence-status" />}
      </div>
    </CanvasOverlay>
  );
}
