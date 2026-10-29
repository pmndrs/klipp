import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useEffect, useRef, useState } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const path: [number, number, number][] = [
  [-10, 2.5, 4],
  [-8, 2, -3],
  [-3, 3, -6],
  [3, 2.2, -6],
  [8, 2, -2],
  [6, 2.6, 4],
  [1, 2, 8],
];

// Pixels of scrolling, or of dragging a finger, from one end of the path to the other.
const scrollLength = 3000;

/** How far the view has been scrolled, from 0 to 1, by the wheel or a vertical drag over it. */
function useScrollProgress() {
  const element = useThree((state) => state.gl.domElement);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const scrollBy = (pixels: number) =>
      setProgress((current) => Math.min(Math.max(current + pixels / scrollLength, 0), 1));
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      scrollBy(event.deltaY);
    };
    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => (touchY = event.touches[0].clientY);
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      scrollBy(touchY - event.touches[0].clientY);
      touchY = event.touches[0].clientY;
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
    };
  }, [element]);

  return progress;
}

export function SplineDollyScroll() {
  const redRef = useRef<Mesh>(null);
  const blueRef = useRef<Mesh>(null);
  const greenRef = useRef<Mesh>(null);
  const yellowRef = useRef<Mesh>(null);
  const progress = useScrollProgress();

  const { damping, easing, debug } = useControls('SplineDolly: Scroll', {
    damping: { value: 0.8, min: 0, max: 3, step: 0.05 },
    easing: { value: 0.6, min: 0, max: 1, step: 0.05 },
    debug: true,
  });

  const targets = [
    { position: 0, lookAt: redRef },
    { position: 1 / 3, lookAt: blueRef },
    { position: 2 / 3, lookAt: greenRef },
    { position: 1, lookAt: yellowRef },
  ];
  const markers = [
    { position: 0, color: '#ff6b4a' },
    { position: 1 / 3, color: '#21a9e0' },
    { position: 2 / 3, color: '#7ed957' },
    { position: 1, color: '#ffd23f' },
  ];

  return (
    <>
      <mesh ref={redRef} position={[-6, 1.5, -1]}>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#ff6b4a" />
      </mesh>
      <mesh ref={blueRef} position={[0, 1, -10]}>
        <boxGeometry args={[1.6, 2, 1.6]} />
        <meshStandardMaterial color="#21a9e0" />
      </mesh>
      <mesh ref={greenRef} position={[10.5, 1.5, -4]}>
        <torusGeometry args={[0.9, 0.3, 16, 48]} />
        <meshStandardMaterial color="#7ed957" />
      </mesh>
      <mesh ref={yellowRef} position={[2, 1.2, 3]}>
        <coneGeometry args={[0.9, 1.8, 24]} />
        <meshStandardMaterial color="#ffd23f" />
      </mesh>
      <GroundClutter layout="standard" />

      <Klipp>
        <VirtualCamera name="spline-dolly-scroll" priority={10}>
          <Body.SplineDolly spline={path} position={progress} damping={damping} debug={debug} />
          <Aim.SplineDollyLookAtTargets targets={targets} easing={easing} />
          <SpectatorFrustum />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="scroll-progress">
          <span className="scroll-progress-label">Scroll</span>
          <div className="scroll-progress-track">
            <div className="scroll-progress-fill" style={{ height: `${progress * 100}%` }} />
            {markers.map((marker) => (
              <div
                key={marker.color}
                className="scroll-progress-marker"
                data-passed={progress >= marker.position || undefined}
                style={{ top: `${marker.position * 100}%`, color: marker.color }}
              />
            ))}
            <div className="scroll-progress-handle" style={{ top: `${progress * 100}%` }} />
          </div>
          <span className="scroll-progress-value">{Math.round(progress * 100)}%</span>
        </div>
      </CanvasOverlay>
    </>
  );
}
