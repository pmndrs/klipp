import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';

import { useRecordingMode } from '../scene/useRecordingMode';
import { showcases } from '../scenes/showcase/showcases';

import { LoadingScreen } from './LoadingScreen';
import { SceneMenu } from './SceneMenu';
import { useQuality } from './useQuality';

/** The showcase named in the URL's hash, like `#porsche`, if there is one. */
const showcaseFromUrl = () => showcases.find(({ slug }) => `#${slug}` === location.hash);

const randomShowcase = () => showcases[Math.floor(Math.random() * showcases.length)];

/** The showcase on the full screen, with the logo, a menu of scenes, and links to the docs and examples. */
export function Landing() {
  const [showcase, setShowcase] = useState(() => showcaseFromUrl() ?? randomShowcase());
  // A scene that was ready once has its model and shaders in place, so coming back to it starts right away.
  const [readySlugs, setReadySlugs] = useState<ReadonlySet<string>>(() => new Set());
  const ready = readySlugs.has(showcase.slug);
  const onReady = useCallback(
    () => setReadySlugs((slugs) => (slugs.has(showcase.slug) ? slugs : new Set(slugs).add(showcase.slug))),
    [showcase],
  );
  const [quality, setQuality] = useQuality();
  useRecordingMode();

  useEffect(() => {
    // Going back to the bare root keeps the scene on screen instead of drawing a new one.
    const onHashChange = () => setShowcase((current) => showcaseFromUrl() ?? current);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { Scene } = showcase;
  return (
    <div className="app">
      <main className="viewer">
        <LoadingScreen ready={ready} />
        {/* The scene waits for the quality, so it never compiles shaders for effects it then drops. */}
        {quality && (
          <Canvas camera={{ position: [0, 0, 12.5], fov: 30 }} dpr={quality === 'hd' ? [1, 1.5] : 1} shadows>
            <Scene key={showcase.slug} ready={ready} onReady={onReady} quality={quality} />
          </Canvas>
        )}
        <a href="https://github.com/pmndrs/klipp" target="_blank" rel="noreferrer" className="landing-logo">
          <h1>Klipp</h1>
          <span>A camera toolkit for the web</span>
        </a>
        <nav className="landing-links">
          <a href="https://pmndrs.github.io/klipp/docs/" target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={`${import.meta.env.BASE_URL}examples/`}>Examples</a>
          <SceneMenu scenes={showcases} current={showcase.slug} quality={quality} onQualityChange={setQuality} />
        </nav>
      </main>
    </div>
  );
}
