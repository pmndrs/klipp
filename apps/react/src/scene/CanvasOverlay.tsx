import { useThree } from '@react-three/fiber';
import { useEffect, useRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

type Overlay = { el: HTMLDivElement; root: Root; unmount?: ReturnType<typeof setTimeout> };

/** Mounts `children` as a separate DOM React root on the canvas's own parent element */
export function CanvasOverlay({ children }: { children: ReactNode }) {
  const container = useThree((state) => state.gl.domElement.parentElement);
  const overlay = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!container) return;
    // A remount right after an unmount, as in StrictMode, keeps the same root and the refs into it.
    clearTimeout(overlay.current?.unmount);
    if (!overlay.current) {
      const el = document.createElement('div');
      el.className = 'canvas-overlay';
      overlay.current = { el, root: createRoot(el) };
    }
    const current = overlay.current;
    container.appendChild(current.el);
    return () => {
      current.el.remove();
      // Unmounting a root while React renders this one is not allowed, so it waits for the current task to end.
      current.unmount = setTimeout(() => {
        current.root.unmount();
        if (overlay.current === current) overlay.current = null;
      });
    };
  }, [container]);

  useEffect(() => {
    overlay.current?.root.render(children);
  });

  return null;
}
