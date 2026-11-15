import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import type { OrbitFollowBodyThree } from '@pmndrs/klipp/three';
import { Environment, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Mesh } from 'three';

import { Preload } from '../Preload';
import type { ShowcaseProps } from '../ShowcaseProps';

import { CanvasOverlay } from '../../../scene/CanvasOverlay';

import tokyoUrl from './model/littlest-tokyo.glb?url';

const modelUrl = 'https://sketchfab.com/3d-models/littlest-tokyo-94b24a60dc1b48248de50bf087c0f042';
const center: [number, number, number] = [0, 0.5, 0];

function Lighting({ hd }: { hd: boolean }) {
  return (
    <>
      <Environment preset="dawn" background environmentIntensity={2} backgroundBlurriness={0.5} />
      <directionalLight
        position={[5, 8, 4]}
        color={0xfff0ad}
        intensity={3}
        castShadow
        shadow-mapSize={hd ? 2048 : 1024}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}>
        <orthographicCamera attach="shadow-camera" args={[-5, 5, 5, -5, 0.5, 30]} />
      </directionalLight>
    </>
  );
}

function Effects({ hd }: { hd: boolean }) {
  return (
    <EffectComposer multisampling={hd ? 4 : 0}>
      <N8AO aoRadius={0.1} distanceFalloff={1} intensity={2.5} halfRes={!hd} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Bloom intensity={0.2} mipmapBlur={true} />
      <Vignette offset={0.5} darkness={0.3} />
    </EffectComposer>
  );
}

function Tokyo({ playing }: { playing: boolean }) {
  const { scene, animations } = useGLTF(tokyoUrl);
  const { actions } = useAnimations(animations, scene);

  useLayoutEffect(() => {
    scene.traverse((object) => {
      if ((object as Mesh).isMesh) object.castShadow = object.receiveShadow = true;
    });
  }, [scene]);

  useEffect(() => {
    const loop = actions['Take 001'];
    if (!loop) return;
    loop.play().setEffectiveTimeScale(playing ? 1 : 0);
  }, [actions, playing]);

  return <primitive object={scene} position={[1, 1, 0]} scale={0.01} />;
}

/** A slow sway around the town, for the hero. */
function OverviewCamera({ moving }: { moving: boolean }) {
  const orbit = useRef<OrbitFollowBodyThree>(null);

  useFrame(({ clock }) => {
    if (moving) orbit.current?.horizontal.setValue(-32 + Math.sin(clock.elapsedTime * 0.15) * 12);
  });

  return (
    <VirtualCamera name="overview" priority={10} initialState={{ fov: 40 }}>
      <Body.OrbitFollow
        ref={orbit}
        target={center}
        radius={9.5}
        horizontal={{ center: -32, damping: 0.4 }}
        vertical={{ center: 12 }}
      />
      <Aim.HardLookAt target={center} />
    </VirtualCamera>
  );
}

function Hero() {
  const [copied, setCopied] = useState(false);
  const command = 'npm i @pmndrs/klipp';

  const copy = () => {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section className="tokyo-section tokyo-hero">
      <h2>Klipp</h2>
      <p>
        Virtual cameras for the web. <br />
        Compose shots, blend between them, and let the user take control.
      </p>
      <button type="button" className="tokyo-install" onClick={copy}>
        <code>{command}</code>
        <span>{copied ? 'copied' : 'copy'}</span>
      </button>
      <nav className="tokyo-hero-links">
        <a href="https://pmndrs.github.io/klipp/docs/" target="_blank" rel="noreferrer">
          Docs
        </a>
        <a href={`${import.meta.env.BASE_URL}examples/`}>Examples</a>
        <a href="https://github.com/pmndrs/klipp" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
      <span className="tokyo-scroll-hint">scroll</span>
    </section>
  );
}

/** The page scrolling over the scene. Marks while the hero fills the screen, so the corner logo steps aside. */
function Story({ children }: { children: ReactNode }) {
  const [atHero, setAtHero] = useState(true);
  return (
    <div
      className="tokyo-story"
      data-at-hero={atHero ? '' : undefined}
      onScroll={(event) => setAtHero(event.currentTarget.scrollTop < event.currentTarget.clientHeight / 2)}>
      {children}
    </div>
  );
}

export function TokyoShowcase({ ready, onReady, quality }: ShowcaseProps) {
  const hd = quality === 'hd';
  return (
    <>
      <Lighting hd={hd} />
      <Effects hd={hd} />
      <Suspense fallback={null}>
        <Tokyo playing={ready} />
        <Preload onReady={onReady} />
      </Suspense>

      {ready && (
        <CanvasOverlay>
          <Story>
            <Hero />
          </Story>
          <a className="showcase-credit" href={modelUrl} target="_blank" rel="noreferrer">
            Littlest Tokyo by glenatron, CC BY 4.0
          </a>
        </CanvasOverlay>
      )}

      <Klipp>
        <OverviewCamera moving={ready} />
      </Klipp>
    </>
  );
}

useGLTF.preload(tokyoUrl);
