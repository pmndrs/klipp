import { Canvas } from '@react-three/fiber';
import { useCallback, useState } from 'react';

import { useRecordingMode } from '../scene/useRecordingMode';
import { CarShowcase } from '../scenes/showcase/CarShowcase';

import { LoadingScreen } from './LoadingScreen';

/** The showcase on the full screen, with the logo and links to the docs and the examples. */
export function Landing() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useRecordingMode();

  return (
    <div className="app">
      <main className="viewer">
        <LoadingScreen ready={ready} />
        <Canvas camera={{ position: [0, 0, 12.5], fov: 30 }} dpr={[1, 1.5]} shadows>
          <CarShowcase ready={ready} onReady={onReady} />
        </Canvas>
        <a href="https://github.com/pmndrs/klipp" target="_blank" rel="noreferrer" className="landing-logo">
          <h1>Klipp</h1>
          <span>A camera toolkit for the web</span>
        </a>
        <nav className="landing-links">
          <a href="https://pmndrs.github.io/klipp/docs/" target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={`${import.meta.env.BASE_URL}examples/`}>Examples</a>
        </nav>
      </main>
    </div>
  );
}
