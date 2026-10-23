import { Loader } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

import { CarShowcase } from '../scenes/showcase/CarShowcase';

/** The showcase on the full screen, with the logo and links to the docs and the examples. */
export function Landing() {
  return (
    <div className="app">
      <main className="viewer">
        <Loader />
        <Canvas camera={{ position: [0, 0, 12.5], fov: 30 }} dpr={[1, 1.5]} shadows>
          <CarShowcase />
        </Canvas>
        <a href="https://github.com/pmndrs/klipp" target="_blank" rel="noreferrer" className="landing-logo">
          <h1>Klipp</h1>
          <span>A camera toolkit for the web</span>
        </a>
        <nav className="landing-links">
          <a href="https://pmndrs.github.io/klipp/docs/" target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href="#/examples">Examples</a>
        </nav>
      </main>
    </div>
  );
}
